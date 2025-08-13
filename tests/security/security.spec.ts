import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware, resetRateLimits, securityHeaders } from '../../middleware';

function createRequest(ip: string, path = '/api/test') {
  return new NextRequest(new URL(`http://example.com${path}`), {
    headers: { 'x-forwarded-for': ip }
  } as any);
}

describe('root middleware security', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('applies security headers to responses', () => {
    const req = createRequest('1.1.1.1');
    const res = middleware(req);
    Object.entries(securityHeaders).forEach(([k, v]) => {
      expect(res.headers.get(k)).toBe(v);
    });
  });

  it('rate limits API routes over threshold', () => {
    let res;
    for (let i = 0; i < 61; i++) {
      res = middleware(createRequest('2.2.2.2'));
    }
    expect(res!.status).toBe(429);
  });

  it('excludes health endpoint from rate limiting', () => {
    let res;
    for (let i = 0; i < 100; i++) {
      res = middleware(createRequest('3.3.3.3', '/api/health'));
    }
    expect(res!.status).toBe(200);
  });
});
