import { NextRequest, NextResponse } from 'next/server';

export const securityHeaders: Record<string, string> = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;
const hits = new Map<string, number[]>();

function getIp(req: NextRequest): string {
  return (
    req.ip ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    // @ts-ignore - socket may exist in some environments
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = hits.get(ip) || [];
  const windowStart = now - WINDOW_MS;
  const recent = timestamps.filter((ts) => ts > windowStart);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length <= MAX_REQUESTS;
}

export function middleware(req: NextRequest) {
  const ip = getIp(req);
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith('/api/') && pathname !== '/api/health') {
    if (!rateLimit(ip)) {
      const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      Object.entries(securityHeaders).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }
  }

  const res = NextResponse.next();
  Object.entries(securityHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export function resetRateLimits() {
  hits.clear();
}

export const config = {
  matcher: '/:path*'
};

