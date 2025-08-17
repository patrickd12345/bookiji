import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createPaymentsWebhookHandler } from '@/lib/paymentsWebhookHandler'

const handler = createPaymentsWebhookHandler()

// In-memory duplicate cache for TEST-BYPASS path only (TTL-based)
const __testProcessedIds = new Map<string, number>()
const DEFAULT_TTL_MS = (parseInt(process.env.TEST_WEBHOOK_DUP_TTL_SECS || '', 10) || 3 * 24 * 60 * 60) * 1000

function markTestProcessed(id: string, now: number) {
  __testProcessedIds.set(id, now + DEFAULT_TTL_MS)
}

function isTestProcessed(id: string, now: number): boolean {
  // GC expired entries lazily
  for (const [key, exp] of __testProcessedIds) {
    if (exp <= now) __testProcessedIds.delete(key)
  }
  const exp = __testProcessedIds.get(id)
  return typeof exp === 'number' && exp > now
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  const maxBodyBytes = parseInt(process.env.WEBHOOK_MAX_BODY_BYTES || '', 10) || 512 * 1024
  const lenHeader = request.headers.get('content-length')
  if (lenHeader && parseInt(lenHeader, 10) > maxBodyBytes) {
    const res = NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    res.headers.set('X-Request-ID', requestId)
    return res
  }
  // TEST-ONLY BYPASS (CI): allow posting a plain JSON event if env is set and header matches.
  // This block must run BEFORE reading the raw body for Stripe signature.
  if (process.env.ENABLE_TEST_WEBHOOK_BYPASS === 'true' || process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV !== 'production') {
    const hdr = request.headers.get('x-test-webhook-key')
    if (hdr && hdr === process.env.TEST_WEBHOOK_KEY) {
      try {
        const payload = await request.json() // expects event-like JSON
        const now = Date.now()
        // Duplicate shield for test-only path
        if (payload && typeof payload.id === 'string' && isTestProcessed(payload.id, now)) {
          const res = NextResponse.json({ ok: true, bypass: true, duplicate: true })
          res.headers.set('X-Request-ID', requestId)
          return res
        }
        // process the event directly using the handler's test entrypoint
        if (typeof (handler as any).processTestEvent === 'function') {
          await (handler as any).processTestEvent(payload)
        }
        if (payload && typeof payload.id === 'string') markTestProcessed(payload.id, now)
        const res = NextResponse.json({ ok: true, bypass: true })
        res.headers.set('X-Request-ID', requestId)
        return res
      } catch (e) {
        const res = NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Invalid payload' }, { status: 400 })
        res.headers.set('X-Request-ID', requestId)
        return res
      }
    }
  }
  const res = await handler.handle(request)
  res.headers.set('X-Request-ID', requestId)
  return res
} 