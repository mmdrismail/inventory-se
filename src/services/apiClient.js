const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SYNC_QUEUE_KEY = 'stockline_pending_sync_queue';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cache = new Map();
    this.defaultTTL = 15 * 1000; // 15 seconds client cache
    this.activeMutations = 0;
    this.isOnline = null; // null = unknown, true = online, false = offline
    this.lastSyncedAt = null;
    this.lastError = null;
    this.listeners = new Set();
    this.isFlushing = false;
  }

  getAuthHeader() {
    try {
      const sessionData = localStorage.getItem('stockline_demo_v1_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session && session.token) {
          return { Authorization: `Bearer ${session.token}` };
        }
      }
    } catch {
      // Ignore
    }
    return {};
  }

  // ==================== SYNC STATE & OUTBOX QUEUE ====================
  getPendingQueue() {
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  savePendingQueue(queue) {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch {}
  }

  getSyncSnapshot() {
    const queue = this.getPendingQueue();
    let status = 'online';
    if (this.activeMutations > 0 || this.isFlushing) {
      status = 'syncing';
    } else if (this.isOnline === false) {
      status = 'offline';
    } else if (queue.length > 0) {
      status = 'queued';
    } else if (this.lastError) {
      status = 'error';
    }

    return {
      status,
      isOnline: this.isOnline,
      pendingCount: queue.length,
      activeMutations: this.activeMutations,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      baseUrl: this.baseUrl,
    };
  }

  subscribeSync(listener) {
    this.listeners.add(listener);
    try {
      listener(this.getSyncSnapshot());
    } catch {}
    return () => this.listeners.delete(listener);
  }

  notifySyncListeners(extraEvent = null) {
    const snapshot = this.getSyncSnapshot();
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot, extraEvent);
      } catch (err) {
        console.error('Sync listener error:', err);
      }
    });
  }

  enqueueMutation({ method, endpoint, body, meta = {} }) {
    const queue = this.getPendingQueue();
    const cleanBody = body ? { ...body } : body;

    // Collapse multiple PUT updates to the same endpoint to avoid redundant writes
    if (method === 'PUT') {
      const existingIdx = queue.findIndex((q) => q.method === 'PUT' && q.endpoint === endpoint);
      if (existingIdx !== -1) {
        queue[existingIdx] = {
          ...queue[existingIdx],
          body: { ...(queue[existingIdx].body || {}), ...(cleanBody || {}) },
          timestamp: Date.now(),
        };
        this.savePendingQueue(queue);
        this.notifySyncListeners({ type: 'queued', endpoint, method });
        return;
      }
    }

    queue.push({
      id: `sync-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      method,
      endpoint,
      body: cleanBody,
      meta,
      timestamp: Date.now(),
    });
    this.savePendingQueue(queue);
    this.notifySyncListeners({ type: 'queued', endpoint, method });
  }

  async flushPendingQueue() {
    if (this.isFlushing) return { flushed: 0, remaining: this.getPendingQueue().length };
    const queue = this.getPendingQueue();
    if (queue.length === 0) return { flushed: 0, remaining: 0 };

    const up = await this.isBackendAvailable();
    if (!up) {
      return { flushed: 0, remaining: queue.length };
    }

    this.isFlushing = true;
    this.notifySyncListeners();

    let flushed = 0;
    const remaining = [];
    const idRemap = new Map(); // Maps temp client ID -> real MongoDB _id

    for (let i = 0; i < queue.length; i++) {
      const item = { ...queue[i] };

      // Remap temporary IDs if an earlier POST in this flush created the MongoDB _id
      for (const [tempId, realId] of idRemap.entries()) {
        if (item.endpoint.includes(tempId)) {
          item.endpoint = item.endpoint.replace(tempId, realId);
        }
        if (item.body && item.body.customerId === tempId) {
          item.body.customerId = realId;
        }
      }

      try {
        const res = await this.request(item.endpoint, {
          method: item.method,
          body: item.body !== undefined ? JSON.stringify(item.body) : undefined,
        });
        flushed++;

        // If POST created a document, record ID remap and update localStorage if meta provides storageKey
        if (item.method === 'POST' && res?.data?._id) {
          if (item.meta?.tempId) {
            idRemap.set(item.meta.tempId, res.data._id);
          }
          if (item.meta?.storageKey && item.meta?.tempId) {
            try {
              const raw = localStorage.getItem(item.meta.storageKey);
              if (raw) {
                const list = JSON.parse(raw);
                const idx = Array.isArray(list)
                  ? list.findIndex((r) => r.id === item.meta.tempId || r._id === item.meta.tempId)
                  : -1;
                if (idx !== -1) {
                  list[idx].id = res.data._id;
                  list[idx]._id = res.data._id;
                  localStorage.setItem(item.meta.storageKey, JSON.stringify(list));
                }
              }
            } catch {}
          }
        }
      } catch (err) {
        if (err.isNetworkError) {
          // Network dropped mid-flush -> keep this and remaining items
          remaining.push(item, ...queue.slice(i + 1));
          break;
        }
        // Server rejected (4xx/validation) -> log warning and do not block rest of queue forever
        console.warn(`[Sync Queue] Dropped rejected mutation ${item.method} ${item.endpoint}:`, err.message);
        this.lastError = err.message;
      }
    }

    this.savePendingQueue(remaining);
    this.isFlushing = false;
    if (flushed > 0) {
      this.clearCache();
      this.lastSyncedAt = Date.now();
      this.lastError = null;
    }
    this.notifySyncListeners({ type: 'flushed', flushed, remaining: remaining.length });
    return { flushed, remaining: remaining.length };
  }

  clearCache(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...(options.headers || {}),
    };

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr) {
      this.isOnline = false;
      const err = new Error(networkErr.message || 'Backend server unreachable');
      err.isNetworkError = true;
      throw err;
    }

    this.isOnline = true;
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMessage);
      err.status = response.status;
      err.isServerError = true;
      throw err;
    }

    return data;
  }

  /**
   * High-speed GET with memory cache
   */
  async get(endpoint, queryParams = {}, config = {}) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, val);
      }
    });
    const qs = params.toString() ? `?${params.toString()}` : '';
    const fullKey = `${endpoint}${qs}`;

    const now = Date.now();
    const cached = this.cache.get(fullKey);

    // Serve from RAM cache if not expired and not bypassed
    if (!config.bypassCache && cached && now < cached.expiresAt) {
      return cached.data;
    }

    const requestHeaders = config.bypassCache ? { 'Cache-Control': 'no-cache' } : {};
    const data = await this.request(fullKey, {
      method: 'GET',
      headers: requestHeaders,
    });

    // Store in RAM cache
    const ttl = config.ttl !== undefined ? config.ttl : this.defaultTTL;
    this.cache.set(fullKey, {
      data,
      expiresAt: now + ttl,
    });

    return data;
  }

  async executeMutation(method, endpoint, body, meta = {}) {
    const rootPath = endpoint.split('?')[0].split('/')[1];
    if (rootPath) this.clearCache(rootPath);
    this.clearCache('reports');
    if (['sales', 'quotations', 'customers'].includes(rootPath)) {
      this.clearCache('customers');
      this.clearCache('sales');
      this.clearCache('quotations');
    }

    // Sanitize immutable MongoDB metadata out of PUT payloads
    let cleanBody = body;
    if (method === 'PUT' && body && typeof body === 'object' && !Array.isArray(body)) {
      cleanBody = { ...body };
      delete cleanBody._id;
      delete cleanBody.__v;
      delete cleanBody.createdAt;
    }

    this.activeMutations++;
    this.notifySyncListeners();

    try {
      const res = await this.request(endpoint, {
        method,
        body: cleanBody !== undefined ? JSON.stringify(cleanBody) : undefined,
      });
      this.lastSyncedAt = Date.now();
      this.lastError = null;
      this.notifySyncListeners({ type: 'mutation-success', method, endpoint, data: res });
      return res;
    } catch (err) {
      if (err.isNetworkError) {
        this.enqueueMutation({ method, endpoint, body: cleanBody, meta });
        this.lastError = 'Backend offline — saved locally and queued for MongoDB sync.';
      } else {
        this.lastError = err.message;
        this.notifySyncListeners({ type: 'mutation-error', method, endpoint, error: err.message });
      }
      throw err;
    } finally {
      this.activeMutations = Math.max(0, this.activeMutations - 1);
      this.notifySyncListeners();
    }
  }

  async post(endpoint, body, meta = {}) {
    return this.executeMutation('POST', endpoint, body, meta);
  }

  async put(endpoint, body, meta = {}) {
    return this.executeMutation('PUT', endpoint, body, meta);
  }

  async delete(endpoint, meta = {}) {
    return this.executeMutation('DELETE', endpoint, undefined, meta);
  }

  async isBackendAvailable() {
    try {
      let signal;
      let timerId;
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        signal = AbortSignal.timeout(2500);
      } else if (typeof AbortController !== 'undefined') {
        const controller = new AbortController();
        timerId = setTimeout(() => controller.abort(), 2500);
        signal = controller.signal;
      }

      const res = await fetch(`${this.baseUrl.replace(/\/api$/, '')}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        ...(signal ? { signal } : {}),
      });
      if (timerId) clearTimeout(timerId);
      const ok = res.ok;
      if (ok) {
        const health = await res.json().catch(() => null);
        this.isOnline = health ? health.database === 'Connected' : true;
      } else {
        this.isOnline = false;
      }
      this.notifySyncListeners();
      return this.isOnline;
    } catch {
      this.isOnline = false;
      this.notifySyncListeners();
      return false;
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
