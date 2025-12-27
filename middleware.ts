import { NextRequest, NextResponse } from 'next/server'
import { buildCSPHeader } from '@/lib/security/csp'
import { adminGuard } from '@/middleware/adminGuard'
import { SYNTHETIC_HEADER, SYNTHETIC_TRACE_HEADER } from '@/lib/simcity/syntheticContext'
import { assertAppEnv } from '@/lib/env/assertAppEnv'

// Validate environment at module load (runs once per server instance)
// This ensures APP_ENV is set before any requests are processed
try {
  assertAppEnv();
} catch (error) {
  // In production, fail fast
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    console.error('❌ CRITICAL: APP_ENV validation failed:', error);
    // Don't throw here - let instrumentation.ts handle it
    // This prevents middleware from crashing on every request
  } else {
    console.warn('⚠️ APP_ENV validation failed (non-fatal in development):', error);
  }
}

// In-memory rate limiter storage
const rateLimitMap = new Map<string, number[]>()
const adminRateLimitMap = new Map<string, number[]>()

const isProd = process.env.NODE_ENV === 'production'

// Rate limit configuration
const MAX_REQUESTS = 60
const WINDOW_MS = 60 * 1000 // 60 seconds

// Admin-specific rate limiting (stricter)
const ADMIN_MAX_REQUESTS = 30
const ADMIN_WINDOW_MS = 60 * 1000 // 60 seconds

function isRateLimited(ip: string, isAdmin: boolean = false): boolean {
  const now = Date.now()
  const windowStart = now - (isAdmin ? ADMIN_WINDOW_MS : WINDOW_MS)
  const maxRequests = isAdmin ? ADMIN_MAX_REQUESTS : MAX_REQUESTS
  const rateLimitMapToUse = isAdmin ? adminRateLimitMap : rateLimitMap
  
  // Get existing timestamps for this IP
  const timestamps = rateLimitMapToUse.get(ip) || []
  
  // Filter timestamps within current window
  const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart)
  
  // Check if limit exceeded
  if (validTimestamps.length >= maxRequests) {
    return true
  }
  
  // Add current timestamp and update map
  validTimestamps.push(now)
  rateLimitMapToUse.set(ip, validTimestamps)
  
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

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Rewrite sched.bookiji.com to show /sched page content (same as www.bookiji.com/sched)
  // Check for sched subdomain (handles both sched.bookiji.com and sched.bookiji.com:port)
  const hostnameWithoutPort = hostname.split(':')[0]
  const isSchedSubdomain = hostnameWithoutPort === 'sched.bookiji.com' || hostnameWithoutPort.startsWith('sched.')
  
  if (isSchedSubdomain) {
    // For root path on sched subdomain, rewrite to /sched page
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/sched'
      const response = NextResponse.rewrite(url)
      response.headers.set('X-Subdomain-Rewrite', 'sched-root->/sched')
      addSecurityHeaders(response)
      return response
    }
    // For /sched path on sched subdomain, let it pass through normally
    // For all other paths on sched subdomain, allow normal routing
    // (this ensures /vendor/*, /api/*, etc. still work)
  }

  if (request.headers.get(SYNTHETIC_HEADER) === 'simcity') {
    const syntheticTrace = request.headers.get(SYNTHETIC_TRACE_HEADER)
    console.log(
      JSON.stringify({
        event: 'synthetic_request',
        synthetic: true,
        synthetic_source: 'simcity',
        synthetic_trace: syntheticTrace,
        env: process.env.BOOKIJI_ENV || process.env.NODE_ENV,
        method: request.method,
        path: pathname,
      }),
    )
  }
  
  // Block non-prod-only routes in production
  if (isProd) {
    const blockedApiPrefixes = ['/api/setup', '/api/test', '/api/check', '/api/dev']
    const blockedPageFragments = ['/test-', '/simple-test', '/theme-demo']

    const isBlockedApiRoute = blockedApiPrefixes.some(prefix => pathname.startsWith(prefix))
    const isBlockedPageRoute = blockedPageFragments.some(fragment => pathname.includes(fragment))

    if (isBlockedApiRoute || isBlockedPageRoute) {
      return new NextResponse('Not Found', { status: 404 })
    }
  }
  
  // Apply admin guard first for all admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const adminGuardResult = await adminGuard(request)
    if (adminGuardResult.status !== 200) {
      return adminGuardResult
    }
  }
  
  // Legacy cancel/reschedule routes redirect
  if (pathname.startsWith('/cancel/') || pathname.startsWith('/reschedule/')) {
    const url = request.nextUrl.clone()
    const m = pathname.match(/\/(cancel|reschedule)\/([^/]+)/)
    if (m?.[2]) {
      url.pathname = `/confirm/${m[2]}`
    } else {
      url.pathname = `/` // fallback home
    }
    url.search = `${search ? `${search}&` : '?'}notice=call-to-change`
    return NextResponse.redirect(url)
  }

  // Skip rate limiting for health check
  if (pathname === '/api/health') {
    const response = NextResponse.next()
    addSecurityHeaders(response)
    return response
  }
  
  // Apply rate limiting to all API routes
  if (pathname.startsWith('/api/')) {
    const clientIP = getClientIP(request)
    const isAdminRoute = pathname.startsWith('/api/admin')
    
    if (isRateLimited(clientIP, isAdminRoute)) {
      const response = new NextResponse(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': (isAdminRoute ? ADMIN_MAX_REQUESTS : MAX_REQUESTS).toString(),
            'X-RateLimit-Window': (isAdminRoute ? ADMIN_WINDOW_MS : WINDOW_MS).toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + (isAdminRoute ? ADMIN_WINDOW_MS : WINDOW_MS)).toISOString(),
          }
        }
      )
      addSecurityHeaders(response)
      return response
    }
    
    // Add rate limit headers to successful responses
    const response = NextResponse.next()
    addSecurityHeaders(response)
    response.headers.set('X-RateLimit-Limit', (isAdminRoute ? ADMIN_MAX_REQUESTS : MAX_REQUESTS).toString())
    response.headers.set('X-RateLimit-Window', (isAdminRoute ? ADMIN_WINDOW_MS : WINDOW_MS).toString())
    
    const rateLimitMapToUse = isAdminRoute ? adminRateLimitMap : rateLimitMap
    const remaining = (isAdminRoute ? ADMIN_MAX_REQUESTS : MAX_REQUESTS) - (rateLimitMapToUse.get(clientIP)?.length || 0)
    response.headers.set('X-RateLimit-Remaining', String(Math.max(0, remaining)))
    
    return response
  }
  
  // Apply security headers to all other routes
  const response = NextResponse.next()
  addSecurityHeaders(response)
  // Add CSP with per-request nonce
  const nonce = Math.random().toString(36).slice(2)
  response.headers.set('Content-Security-Policy', buildCSPHeader(nonce))
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
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * 
     * Note: The pattern uses (.*)? to match zero or more characters,
     * ensuring both '/' and '/sched' (and all other paths) are matched.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)?',
  ],
}
