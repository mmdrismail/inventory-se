/**
 * High-Performance In-Memory Cache Middleware for Express
 * Provides microsecond response times for read queries with automatic mutation-based invalidation.
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key, data, ttlSeconds = 30) {
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

const memoryCache = new MemoryCache();

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

    // Skip caching if requested via header
    if (req.headers['cache-control'] === 'no-cache') {
      return next();
    }

    const key = `${req.originalUrl || req.url}`;
    const cachedResponse = memoryCache.get(key);

    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
      return res.json(cachedResponse);
    }

    // Intercept res.json to cache the outgoing data
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryCache.set(key, body, ttlSeconds);
        res.setHeader('X-Cache', 'MISS');
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
