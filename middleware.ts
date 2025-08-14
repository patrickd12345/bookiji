import { NextRequest, NextResponse } from 'next/server';

const securityHeaders: Record<string, string> = {
  // Tight but Mapbox-friendly
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self' https://api.mapbox.com",
    "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
    "img-src 'self' data: blob: https://api.mapbox.com https://*.tiles.mapbox.com",
    "connect-src 'self' https://api.mapbox.com https://events.mapbox.com",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "frame-src 'self'",
  ].join('; '),
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};

// Sliding-window rate limiter for /api/* (except /api/health)
const RL_WINDOW_MS = 60_000;
const RL_MAX = 60;
const rlStore: Map<string, number[]> = new Map();

function getClientIp(req: NextRequest) {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  // @ts-ignore - environment dependent
  const ip = (req as any)?.ip || (req as any)?.socket?.remoteAddress;
  return ip ? String(ip) : 'unknown';
}

function recordHit(ip: string) {
  const now = Date.now();
  const arr = rlStore.get(ip) ?? [];
  const fresh = arr.filter(t => now - t < RL_WINDOW_MS);
  fresh.push(now);
  rlStore.set(ip, fresh);
  return fresh.length;
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith('/api/') && path !== '/api/health') {
    const ip = getClientIp(request);
    const count = recordHit(ip);
    if (count > RL_MAX) {
      const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      Object.entries(securityHeaders).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }
  }

  const res = NextResponse.next();
  Object.entries(securityHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export const config = { matcher: '/:path*' };

