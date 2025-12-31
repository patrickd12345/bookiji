import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/notifications/send/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/notifications/intentDispatcher', () => ({
  dispatchIntentToRecipient: vi.fn()
}))

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
    const { dispatchIntentToRecipient } = await import('@/lib/notifications/intentDispatcher')
    vi.mocked(dispatchIntentToRecipient).mockRejectedValueOnce(new Error('Provider failed'))

    const res = await POST(mkReq({ type: 'email', recipient: 'u@test.com', template: 'verify_email', data: {} }) as unknown as NextRequest)
    const json = await res!.json()
    expect(res!.status).toBe(500)
    expect(json.success).toBe(false)
  })
})


