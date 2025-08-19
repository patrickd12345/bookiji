import { describe, it, expect, vi } from 'vitest'
import { PaymentsWebhookHandlerImpl, type PaymentIntentWithMetadata } from '@/lib/paymentsWebhookHandler'
import { NextRequest } from 'next/server'

function createMockNextRequest(body: string, headers: Record<string, string>) {
  // Minimal NextRequest shim using Request
  const req = new Request('https://example.com/api/payments/webhook', {
    method: 'POST',
    headers,
    body
  }) as unknown as NextRequest
  return req
}

describe('PaymentsWebhookHandlerImpl idempotency', () => {
  const mockSupabase = {
    from: vi.fn((table: string) => {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) }))
        })),
        insert: vi.fn(async () => ({ error: null })),
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }))
      }
    })
  }

  const basePaymentIntent: PaymentIntentWithMetadata = {
    id: 'pi_test',
    object: 'payment_intent',
    amount: 100,
    currency: 'usd',
    metadata: { booking_id: 'booking_123' }
  } as unknown as PaymentIntentWithMetadata

  it('skips already-processed events', async () => {
    // wasEventProcessed -> true
    const supabaseProcessed = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { event_id: 'evt_1' }, error: null })) }))
        }))
      }))
    }

    const handler = new PaymentsWebhookHandlerImpl(
      () => ({
        webhooks: {
          constructEvent: vi.fn(() => ({ id: 'evt_1', type: 'payment_intent.succeeded', data: { object: basePaymentIntent } }))
        }
      }) as any,
      supabaseProcessed as any,
      vi.fn(),
      vi.fn()
    )

    const req = createMockNextRequest('{}', { 'stripe-signature': 'test' })
    const res = await handler.handle(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.received).toBe(true)
  })

  it('marks new events as processed after handling', async () => {
    const trackSuccess = vi.fn()
    const handler = new PaymentsWebhookHandlerImpl(
      () => ({
        webhooks: {
          constructEvent: vi.fn(() => ({ id: 'evt_2', type: 'payment_intent.succeeded', data: { object: basePaymentIntent } }))
        }
      }) as any,
      mockSupabase as any,
      trackSuccess,
      vi.fn()
    )

    const req = createMockNextRequest('{}', { 'stripe-signature': 'test' })
    const res = await handler.handle(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.received).toBe(true)
    expect(trackSuccess).toHaveBeenCalled()
    expect(mockSupabase.from).toHaveBeenCalledWith('processed_webhook_events')
  })
})


