import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

type LimiterConfig = {
  windowMs: number
  max: number
  statusCode?: number
}

type HitEntry = { count: number; reset: number }

const ipHits = new Map<string, HitEntry>()

export function getClientIp(request: Request): string {
  const xfwd = request.headers.get('x-forwarded-for') || ''
  const xreal = request.headers.get('x-real-ip') || ''
  const ip = xfwd.split(',')[0].trim() || xreal || 'unknown'
  return ip
}

export function limitRequest(request: Request, config: LimiterConfig): NextResponse | null | Promise<NextResponse | null> {
  // Dev convenience: do not rate-limit test-only endpoints
  try {
    const path = new URL(request.url).pathname
    if (process.env.NODE_ENV !== 'production' && path.startsWith('/api/test/')) {
      return null
    }
  } catch {}
  // Supabase-backed limiter (preferred in prod); falls back to memory when unavailable
  try {
    const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey?: string }
    if (url && secretKey) {
      const s = createClient(url, secretKey, { auth: { persistSession: false } })
      const ip = getClientIp(request)
      const windowSec = Math.floor(config.windowMs / 1000)
      return (async () => {
        const { data, error } = await s.rpc('bump_rate_limit', { p_ip: ip, p_window_seconds: windowSec, p_max: config.max })
        if (error) return memoryFallback(request, config)
        if (data === false) {
          const status = config.statusCode ?? 429
          return NextResponse.json({ error: 'Too many requests' }, { status })
        }
        return null
      })()
    }
  } catch {}
  return memoryFallback(request, config)
}


function memoryFallback(request: Request, config: LimiterConfig): NextResponse | null {
  const ip = getClientIp(request)
  const now = Date.now()
  const entry = ipHits.get(ip) || { count: 0, reset: now + config.windowMs }

  if (now > entry.reset) {
    entry.count = 0
    entry.reset = now + config.windowMs
  }

  entry.count += 1
  ipHits.set(ip, entry)

  if (entry.count > config.max) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Rate limited', { ip, count: entry.count, windowMs: config.windowMs })
    }
    const status = config.statusCode ?? 429
    return NextResponse.json({ error: 'Too many requests' }, { status })
  }

  return null
}


