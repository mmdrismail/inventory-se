/**
 * StockLine Enterprise High-Speed Sliding-Window Rate Limiter
 * Zero external dependencies. Ultra-low RAM footprint.
 * Protects against brute-force password cracking, API hammering & DoS attacks.
 */

class SlidingWindowRateLimiter {
  constructor(windowMs = 15 * 60 * 1000, maxRequests = 100, message = 'Too many requests. Please try again later.') {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message;
    this.hits = new Map(); // ip -> [timestamp, timestamp, ...]

    // Periodic cleanup of stale client IPs every 2 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [ip, timestamps] of this.hits.entries()) {
        const valid = timestamps.filter((t) => now - t < this.windowMs);
        if (valid.length === 0) {
          this.hits.delete(ip);
        } else {
          this.hits.set(ip, valid);
        }
      }
    }, 2 * 60 * 1000);

    // Prevent timer from keeping Node process alive in tests
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  middleware() {
    return (req, res, next) => {
      // Allow localhost in testing or health check
      if (req.path === '/api/health' || req.path === '/') {
        return next();
      }

      const clientIp =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown_ip';

      const now = Date.now();
      const timestamps = this.hits.get(clientIp) || [];
      const windowStart = now - this.windowMs;

      // Filter timestamps within current window
      const validTimestamps = timestamps.filter((t) => t > windowStart);

      if (validTimestamps.length >= this.maxRequests) {
        const oldestTime = validTimestamps[0];
        const retryAfterSec = Math.ceil((oldestTime + this.windowMs - now) / 1000);

        res.setHeader('Retry-After', Math.max(1, retryAfterSec));
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);

        return res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: this.message,
          retryAfterSeconds: Math.max(1, retryAfterSec),
        });
      }

      validTimestamps.push(now);
      this.hits.set(clientIp, validTimestamps);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - validTimestamps.length));

      next();
    };
  }
}

// 1. Strict Auth Limiter: 30 login/register attempts per 15 minutes per IP
const authRateLimiter = new SlidingWindowRateLimiter(
  15 * 60 * 1000,
  30,
  'Too many authentication attempts from this IP address. Please wait 15 minutes before trying again.'
).middleware();

// 2. General API Limiter: 400 requests per 15 minutes per IP (generous for POS & inventory batch updates)
const apiRateLimiter = new SlidingWindowRateLimiter(
  15 * 60 * 1000,
  400,
  'API rate limit exceeded. Please slow down your requests.'
).middleware();

module.exports = {
  authRateLimiter,
  apiRateLimiter,
  SlidingWindowRateLimiter,
};
