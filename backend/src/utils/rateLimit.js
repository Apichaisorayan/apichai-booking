// Simple in-memory rate limiter for Cloudflare Workers
// For production, consider using Cloudflare KV or Durable Objects

class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  // Clean up old entries (older than windowMs)
  cleanup(windowMs) {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now - data.firstRequest > windowMs) {
        this.requests.delete(key);
      }
    }
  }

  // Check if request should be allowed
  check(identifier, maxRequests, windowMs) {
    const now = Date.now();
    const data = this.requests.get(identifier);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup(windowMs);
    }

    if (!data) {
      // First request from this identifier
      this.requests.set(identifier, {
        count: 1,
        firstRequest: now,
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    // Check if window has expired
    if (now - data.firstRequest > windowMs) {
      // Reset the window
      this.requests.set(identifier, {
        count: 1,
        firstRequest: now,
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    // Within the window
    if (data.count >= maxRequests) {
      const resetTime = data.firstRequest + windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfter,
      };
    }

    // Increment count
    data.count++;
    this.requests.set(identifier, data);
    return { allowed: true, remaining: maxRequests - data.count };
  }
}

// Global rate limiter instance
const globalLimiter = new RateLimiter();

// Rate limit middleware
export const rateLimitMiddleware = (options = {}) => {
  const {
    maxRequests = 5, // Max requests per window
    windowMs = 15 * 60 * 1000, // 15 minutes
    keyGenerator = (c) => {
      // Use IP address as identifier
      const ip = c.req.header('cf-connecting-ip') || 
                 c.req.header('x-forwarded-for') || 
                 c.req.header('x-real-ip') || 
                 'unknown';
      return ip;
    },
    message = 'Too many requests, please try again later',
  } = options;

  return async (c, next) => {
    const identifier = keyGenerator(c);
    const result = globalLimiter.check(identifier, maxRequests, windowMs);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());

    if (!result.allowed) {
      c.header('Retry-After', result.retryAfter.toString());
      return c.json(
        {
          success: false,
          error: message,
          retryAfter: result.retryAfter,
        },
        429
      );
    }

    await next();
  };
};

// Specific rate limiters for different endpoints
export const authRateLimit = rateLimitMiddleware({
  maxRequests: 5, // 5 attempts
  windowMs: 15 * 60 * 1000, // per 15 minutes
  message: 'Too many authentication attempts. Please try again later.',
});

export const strictAuthRateLimit = rateLimitMiddleware({
  maxRequests: 3, // 3 attempts
  windowMs: 15 * 60 * 1000, // per 15 minutes
  message: 'Too many failed attempts. Please try again later.',
});

export const apiRateLimit = rateLimitMiddleware({
  maxRequests: 100, // 100 requests
  windowMs: 15 * 60 * 1000, // per 15 minutes
  message: 'API rate limit exceeded. Please try again later.',
});
