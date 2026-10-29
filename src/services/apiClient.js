const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cache = new Map();
    this.defaultTTL = 15 * 1000; // 15 seconds client cache
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

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = data?.message || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (err) {
      // Re-throw so callers can handle or fallback gracefully
      throw err;
    }
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

    const data = await this.request(fullKey, { method: 'GET' });

    // Store in RAM cache
    const ttl = config.ttl !== undefined ? config.ttl : this.defaultTTL;
    this.cache.set(fullKey, {
      data,
      expiresAt: now + ttl,
    });

    return data;
  }

  async post(endpoint, body) {
    // Invalidate related cache
    const rootPath = endpoint.split('?')[0].split('/')[1];
    if (rootPath) this.clearCache(rootPath);
    this.clearCache('reports');

    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put(endpoint, body) {
    // Invalidate related cache
    const rootPath = endpoint.split('?')[0].split('/')[1];
    if (rootPath) this.clearCache(rootPath);
    this.clearCache('reports');

    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete(endpoint) {
    // Invalidate related cache
    const rootPath = endpoint.split('?')[0].split('/')[1];
    if (rootPath) this.clearCache(rootPath);
    this.clearCache('reports');

    return this.request(endpoint, { method: 'DELETE' });
  }

  async isBackendAvailable() {
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/api$/, '')}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
