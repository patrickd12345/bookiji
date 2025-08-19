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

  it('returns 200 for duplicate event id in test-bypass path (no-op)', async () => {
    process.env.ENABLE_TEST_WEBHOOK_BYPASS = 'true'
    process.env.TEST_WEBHOOK_KEY = 'tkey'
    const event = { id: 'evt_dup', type: 'payment_intent.succeeded', data: { object: { metadata: { booking_id: 'b1' }, amount: 100, currency: 'usd' } } }
    const makeReq = () => new NextRequest(new Request(`${BASE_URL}/api/payments/webhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-test-webhook-key': 'tkey' }, body: JSON.stringify(event)
    }))
    const r1 = await POST(makeReq())
    expect(r1.status).toBe(200)
    const r2 = await POST(makeReq())
    expect(r2.status).toBe(200)
    const b2 = await r2.json()
    expect(b2.duplicate).toBe(true)
  })

  it('returns 200 for unhandled event types (ignored)', async () => {
    process.env.ENABLE_TEST_WEBHOOK_BYPASS = 'true'
    process.env.TEST_WEBHOOK_KEY = 'tkey'
    const event = { id: 'evt_other', type: 'charge.refunded', data: { object: {} } }
    const req = new NextRequest(new Request(`${BASE_URL}/api/payments/webhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-test-webhook-key': 'tkey' }, body: JSON.stringify(event)
    }))
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('handles missing booking_id on payment_intent.succeeded (no throw)', async () => {
    process.env.ENABLE_TEST_WEBHOOK_BYPASS = 'true'
    process.env.TEST_WEBHOOK_KEY = 'tkey'
    const event = { id: 'evt_missing_meta', type: 'payment_intent.succeeded', data: { object: { amount: 100, currency: 'usd' } } }
    const req = new NextRequest(new Request(`${BASE_URL}/api/payments/webhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-test-webhook-key': 'tkey' }, body: JSON.stringify(event)
    }))
    const res = await POST(req)
    // handler logs and returns 200 in current implementation
    expect(res.status).toBe(200)
  })
})


