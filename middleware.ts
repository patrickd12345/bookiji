import { NextRequest, NextResponse } from 'next/server'
import { buildCSPHeader } from '@/lib/security/csp'

// In-memory rate limiter storage
const rateLimitMap = new Map<string, number[]>()

// Rate limit configuration
const MAX_REQUESTS = 60
const WINDOW_MS = 60 * 1000 // 60 seconds

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const windowStart = now - WINDOW_MS
  
  // Get existing timestamps for this IP
  const timestamps = rateLimitMap.get(ip) || []
  
  // Filter timestamps within current window
  const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart)
  
  // Check if limit exceeded
  if (validTimestamps.length >= MAX_REQUESTS) {
    return true
  }
  
  // Add current timestamp and update map
  validTimestamps.push(now)
  rateLimitMap.set(ip, validTimestamps)
  
  return false
}

function getClientIP(request: NextRequest): string {
  // Try various headers for IP detection
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback to connection remote address
  return 'unknown'
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  
  // Redirect legacy cancel/reschedule routes
  if (pathname.startsWith('/cancel/') || pathname.startsWith('/reschedule/')) {
    const url = request.nextUrl.clone()
    // Attempt to extract bookingId if present; else send to /bookings with notice
    const m = pathname.match(/\/(cancel|reschedule)\/([^/]+)/)
    if (m?.[2]) {
      url.pathname = `/booking/${m[2]}`
    } else {
      url.pathname = `/bookings`
    }
    url.search = `${search ? `${search}&` : "?"}notice=call-to-change`
    return NextResponse.redirect(url)
  }
  
  // Admin routes are now protected by server-side auth in admin/layout.tsx
  // No client-side header checks needed
  
  // Skip rate limiting for health check
  if (pathname === '/api/health') {
    const response = NextResponse.next()
    addSecurityHeaders(response)
    return response
  }
  
  // Apply rate limiting to all API routes
  if (pathname.startsWith('/api/')) {
    const clientIP = getClientIP(request)
    
    if (isRateLimited(clientIP)) {
      const response = new NextResponse(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': MAX_REQUESTS.toString(),
            'X-RateLimit-Window': WINDOW_MS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + WINDOW_MS).toISOString(),
          }
        }
      )
      addSecurityHeaders(response)
      return response
    }
    
    // Add rate limit headers to successful responses
    const response = NextResponse.next()
    addSecurityHeaders(response)
    response.headers.set('X-RateLimit-Limit', MAX_REQUESTS.toString())
    response.headers.set('X-RateLimit-Window', WINDOW_MS.toString())
    response.headers.set('X-RateLimit-Remaining', String(MAX_REQUESTS - (rateLimitMap.get(clientIP)?.length || 0)))
    
    return response
  }
  
  // Apply security headers to all other routes
  const response = NextResponse.next()
  // Block indexing on non-prod
  if (process.env.VERCEL_ENV !== 'production') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  addSecurityHeaders(response)
  // Add CSP with per-request nonce
  const nonce = Math.random().toString(36).slice(2)
  response.headers.set('Content-Security-Policy', buildCSPHeader(nonce))
  response.headers.set('x-nonce', nonce)
  return response
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}

