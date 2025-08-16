import { NextResponse } from 'next/server'

type LimiterConfig = {
  windowMs: number
  max: number
}

type HitEntry = { count: number; reset: number }

const ipHits = new Map<string, HitEntry>()

export function getClientIp(request: Request): string {
  const xfwd = request.headers.get('x-forwarded-for') || ''
  const xreal = request.headers.get('x-real-ip') || ''
  const ip = xfwd.split(',')[0].trim() || xreal || 'unknown'
  return ip
}

export function limitRequest(request: Request, config: LimiterConfig): NextResponse | null {
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
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  return null
}


