import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/notifications/send/route'
import { NextRequest } from 'next/server'

type SendBody = { type?: string; recipient?: string; template?: string; data?: Record<string, unknown> }

const mkReq = (body: SendBody) => new Request('https://example.com/api/notifications/send', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body)
})

describe('POST /api/notifications/send', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('validates required fields', async () => {
    const res = await POST(mkReq({}) as unknown as NextRequest)
    const json = await res!.json()
    expect(res!.status).toBe(400)
    expect(json.error).toBeTruthy()
  })

  it('returns 500 when provider fails (email)', async () => {
    // Force provider branch by mocking env
    const origKey = process.env.SENDGRID_API_KEY
    const origFrom = process.env.SENDGRID_FROM
    process.env.SENDGRID_API_KEY = 'key'
    process.env.SENDGRID_FROM = 'test@example.com'

    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: false, status: 500 } as any)
    // Reduce retries to avoid test timeout
    const mod = await import('@/lib/services/notificationRetry')
    const original = mod.retryNotification
    vi.spyOn(mod, 'retryNotification').mockImplementation((sendFn, notification) => original(sendFn, notification as any, 1, 1))

    const res = await POST(mkReq({ type: 'email', recipient: 'u@test.com', template: 'verify_email', data: {} }) as unknown as NextRequest)
    const json = await res!.json()
    expect(res!.status).toBe(500)
    expect(json.success).toBe(false)
    fetchSpy.mockRestore()
    process.env.SENDGRID_API_KEY = origKey
    process.env.SENDGRID_FROM = origFrom
  })
})


