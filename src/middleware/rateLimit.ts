import type { NextApiRequest, NextApiResponse } from 'next';

export interface RateLimitConfig {
  windowMs: number; // time window in ms
  maxRequests: number; // max requests per window
  message: string; // error message when limit exceeded
  statusCode: number; // HTTP status code
}

export type RateLimitMiddleware = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) => void;

/**
 * Creates a simple in-memory rate limiter middleware.
 * Limits requests per IP within a sliding window.
 */
export function createRateLimiter(config: RateLimitConfig): RateLimitMiddleware {
  const hits = new Map<string, { count: number; reset: number }>();

  return (req, res, next) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const now = Date.now();
    const entry = hits.get(ip) || { count: 0, reset: now + config.windowMs };

    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + config.windowMs;
    }

    entry.count += 1;
    hits.set(ip, entry);

    if (entry.count > config.maxRequests) {
      res.status(config.statusCode).json({ error: config.message });
      return;
    }

    next();
  };
}
