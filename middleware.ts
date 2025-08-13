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
const hits = new Map<string, { count: number; reset: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, reset: now + WINDOW_MS };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + WINDOW_MS;
  }
  entry.count += 1;
  hits.set(ip, entry);
  return entry.count <= MAX_REQUESTS;
}

export function middleware(req: NextRequest) {
  const ip = req.ip ?? 'unknown';
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith('/api') && pathname !== '/api/health') {
    if (!rateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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

