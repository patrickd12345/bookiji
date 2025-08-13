import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '@/middleware/rateLimit';
import { withSecurityHeaders, securityHeaders } from '@/middleware/security';
import { withValidation } from '@/middleware/inputValidation';
import { z } from 'zod';
import { validateEnv } from '@/lib/security/envValidator';

function mockReq(ip = '1.1.1.1', body: any = undefined) {
  return {
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
    body,
  } as any;
}

function mockRes() {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader(key: string, value: string) {
      headers[key] = value;
    },
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.payload = payload;
      return this;
    },
    end() {
      /* noop */
    },
  } as any;
}

describe('security middleware', () => {
  it('rate limiter blocks after threshold', () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      maxRequests: 2,
      message: 'Too many',
      statusCode: 429,
    });
    const req = mockReq();
    const res = mockRes();
    let nextCount = 0;
    const next = () => {
      nextCount++;
    };

    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);

    expect(nextCount).toBe(2);
    expect(res.statusCode).toBe(429);
  });

  it('applies security headers', () => {
    const handler = withSecurityHeaders((_req, res) => {
      res.end();
    });
    const req = mockReq();
    const res = mockRes();
    handler(req, res);
    Object.entries(securityHeaders).forEach(([key, value]) => {
      expect(res.headers[key]).toBe(value);
    });
  });

  it('validates input', () => {
    const schema = z.object({ name: z.string() });
    const handler = withValidation(schema, (_req, res) => {
      res.end();
    });
    const req = mockReq('1.1.1.1', {});
    const res = mockRes();
    handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('validates environment', () => {
    expect(() =>
      validateEnv({ SUPABASE_URL: 'https://example.com', SUPABASE_ANON_KEY: 'key' })
    ).not.toThrow();
  });
});
