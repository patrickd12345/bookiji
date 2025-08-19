import { describe, it, expect, vi } from 'vitest'
import { PaymentsWebhookHandlerImpl, type PaymentIntentWithMetadata } from '@/lib/paymentsWebhookHandler'
import { NextRequest } from 'next/server'

function req(body: string, headers: Record<string, string> = {}) {
  return new Request('https://example.com/api/payments/webhook', {
    method: 'POST',
    headers,
    body
  }) as unknown as NextRequest
}

describe('Payments webhook security and paths', () => {
  it('returns 400 when no signature header present', async () => {
    const handler = new PaymentsWebhookHandlerImpl(
      () => ({}) as any,
      { from: vi.fn() } as any,
      vi.fn(),
      vi.fn()
    )
    const res = await handler.handle(req('{}'))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toBe('No signature')
  })

  it('handles payment_intent.canceled and updates booking', async () => {
    const baseIntent: PaymentIntentWithMetadata = {
      id: 'pi_cancel',
      object: 'payment_intent',
      amount: 100,
      currency: 'usd',
      metadata: { booking_id: 'booking_cancel_1' }
    } as unknown as PaymentIntentWithMetadata

    const updateSpy = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }))
    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === 'processed_webhook_events') {
          return {
            select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })) })),
            insert: vi.fn(async () => ({ error: null }))
          }
        }
        if (table === 'bookings') {
          return { update: updateSpy }
        }
        return {}
      })
    }

    const handler = new PaymentsWebhookHandlerImpl(
      () => ({ webhooks: { constructEvent: vi.fn(() => ({ id: 'evt_cancel', type: 'payment_intent.canceled', data: { object: baseIntent } })) } }) as any,
      supabaseMock as any,
      vi.fn(),
      vi.fn()
    )

    const res = await handler.handle(req('{}', { 'stripe-signature': 'sig' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.received).toBe(true)
    expect(supabaseMock.from).toHaveBeenCalledWith('bookings')
  })
})


