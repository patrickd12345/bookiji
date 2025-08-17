import { describe, it, expect, beforeEach } from 'vitest'
import { POST } from '@/app/api/payments/webhook/route'
import { NextRequest } from 'next/server'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('Payments webhook negative cases', () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
    process.env.ENABLE_TEST_WEBHOOK_BYPASS = 'false'
  })

  it('returns 400 when signature header is missing', async () => {
    const req = new NextRequest(
      new Request(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      })
    )

    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/No signature/i)
  })

  it('returns 400 when signature is invalid/unverifiable', async () => {
    const req = new NextRequest(
      new Request(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'stripe-signature': 'bogus' },
        body: JSON.stringify({ test: true })
      })
    )

    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/Invalid signature|No signature/i)
  })
})


