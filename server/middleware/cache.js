/**
 * High-Performance In-Memory Cache Middleware for Express
 * Provides microsecond response times for read queries with automatic mutation-based invalidation.
 */

class MemoryCache {
  constructor(maxEntries = 500) {
    this.cache = new Map();
    this.maxEntries = maxEntries;

    // Background sweep of expired cache entries every 60 seconds
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60 * 1000);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.data;
  }

  set(key, data, ttlSeconds = 30) {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry (first item in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clearByPattern(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix) || key.includes(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  flush() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

const memoryCache = new MemoryCache(500);

/**
 * Express middleware for caching GET responses
 * @param {number} ttlSeconds - Time to live in seconds (default: 30)
 */
const cacheMiddleware = (ttlSeconds = 30) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if requested via header or cache-buster query param
    const cc = String(req.headers['cache-control'] || '').toLowerCase();
    if (cc.includes('no-cache') || cc.includes('no-store') || req.query?._t) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return next();
    }

    const key = `${req.originalUrl || req.url}`;
    const cachedResponse = memoryCache.get(key);

    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res.json(cachedResponse);
    }

    // Intercept res.json to cache the outgoing data
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryCache.set(key, body, ttlSeconds);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Middleware that invalidates cache entries when mutating requests occur
 */
const cacheInvalidator = (entityPrefixes = []) => {
  return (req, res, next) => {
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

    if (isMutation) {
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Invalidate specific entities or deduce from current path
          const pathSegments = req.baseUrl || req.originalUrl;
          memoryCache.clearByPattern(pathSegments);
          
          entityPrefixes.forEach((prefix) => {
            memoryCache.clearByPattern(prefix);
          });

          // Always invalidate reports and summary when mutations occur
          memoryCache.clearByPattern('/api/reports');

          // If inventory, sales, purchases, or orders mutate, invalidate products and inventory caches
          const pathStr = String(pathSegments);
          if (
            pathStr.includes('/purchases') ||
            pathStr.includes('/sales') ||
            pathStr.includes('/orders') ||
            pathStr.includes('/inventory') ||
            pathStr.includes('/products') ||
            pathStr.includes('/lots')
          ) {
            memoryCache.clearByPattern('/api/products');
            memoryCache.clearByPattern('/api/inventory');
          }

          // Cross-invalidate customers, sales, quotations, and money receipts on linked updates
          if (
            pathStr.includes('/customers') ||
            pathStr.includes('/sales') ||
            pathStr.includes('/quotations') ||
            pathStr.includes('/money-receipts')
          ) {
            memoryCache.clearByPattern('/api/customers');
            memoryCache.clearByPattern('/api/sales');
            memoryCache.clearByPattern('/api/quotations');
            memoryCache.clearByPattern('/api/money-receipts');
          }
        }
        return originalJson(body);
      };
    }

    next();
  };
};

module.exports = {
  memoryCache,
  cacheMiddleware,
  cacheInvalidator,
};
