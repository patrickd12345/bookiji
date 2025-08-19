import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later.',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => this.getClientIdentifier(req),
      ...config
    };

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private getClientIdentifier(req: NextRequest): string {
    // Try to get real IP from various headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    const ip = forwardedFor?.split(',')[0]?.trim() || 
               realIp || 
               cfConnectingIp || 
               'unknown';

    // Also include user agent for additional uniqueness
    const userAgent = req.headers.get('user-agent') || 'unknown';
    return `${ip}:${userAgent.slice(0, 50)}`;
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  public check(req: NextRequest): { 
    allowed: boolean; 
    limit: number; 
    remaining: number; 
    resetTime: number;
    retryAfter?: number;
  } {
    const key = this.config.keyGenerator!(req);
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    // Initialize or reset if window expired
    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = {
        count: 0,
        resetTime
      };
    }

    const current = this.store[key];
    const allowed = current.count < this.config.maxRequests;
    
    if (allowed) {
      current.count++;
    }

    return {
      allowed,
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - current.count),
      resetTime: current.resetTime,
      retryAfter: allowed ? undefined : Math.ceil((current.resetTime - now) / 1000)
    };
  }

  public middleware() {
    return (req: NextRequest) => {
      const result = this.check(req);
      
      if (!result.allowed) {
        return NextResponse.json(
          { 
            error: this.config.message,
            retryAfter: result.retryAfter 
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': result.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
              'Retry-After': result.retryAfter?.toString() || '60'
            }
          }
        );
      }

      // Add rate limit headers to successful responses
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      
      return response;
    };
  }
}

// Pre-configured rate limiters for different endpoints
export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many API requests, please try again later.'
});

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 auth attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.'
});

export const searchRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 searches per minute
  message: 'Too many search requests, please slow down.'
});

export const bookingRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3, // 3 booking attempts per minute
  message: 'Too many booking attempts, please wait before trying again.'
});

export const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 uploads per minute
  message: 'Too many upload requests, please wait before uploading again.'
});

// Utility function to apply rate limiting to API routes
export function withRateLimit(
  rateLimiter: RateLimiter,
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const middleware = rateLimiter.middleware();
    const rateLimitResult = middleware(req);
    
    // If rate limited, return the rate limit response
    if (rateLimitResult instanceof NextResponse && rateLimitResult.status === 429) {
      return rateLimitResult;
    }
    
    // Otherwise, call the original handler
    const response = await handler(req);
    
    // Add rate limit headers to the response
    const result = rateLimiter.check(req);
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    return response;
  };
}

// Export individual rate limiters for specific use cases
export { RateLimiter };

// Usage example:
// export const GET = withRateLimit(apiRateLimiter, async (req: NextRequest) => {
//   // Your API logic here
//   return NextResponse.json({ message: 'Success' });
// });
