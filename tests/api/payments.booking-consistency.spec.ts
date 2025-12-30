/**
 * Payment ↔ Booking Consistency Tests
 *
 * Unit-level tests for confirm + webhook invariants.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const stripeRetrieveMock = vi.fn()
const stripeConstructEventMock = vi.fn()

vi.mock('stripe', () => ({
  default: class Stripe {
    paymentIntents = {
      retrieve: stripeRetrieveMock,
      create: vi.fn()
    }
    webhooks = {
      constructEvent: stripeConstructEventMock
    }
    constructor() {}
  }
}))

const supabaseAdminMock = {
  from: vi.fn()
} as any

vi.mock('@/lib/supabaseProxies', () => ({
  supabaseAdmin: supabaseAdminMock
}))

vi.mock('@/config/featureFlags', () => ({
  featureFlags: {
    beta: { core_booking_flow: true },
    payments: { hold_timeout_minutes: 15, hold_amount_cents: 1000 },
    slo: {
      enabled: false,
      quote_endpoint_target_p95_ms: 1000,
      quote_endpoint_target_p99_ms: 2000,
      confirm_endpoint_target_p95_ms: 1000,
      confirm_endpoint_target_p99_ms: 2000
    }
  }
}))

vi.mock('@/lib/guards/subscriptionGuard', () => ({
  SubscriptionRequiredError: class SubscriptionRequiredError extends Error {},
  assertVendorHasActiveSubscription: vi.fn(async () => {})
}))

vi.mock('@/lib/guards/invariantAssertions', () => ({
  assertValidBookingStateTransition: vi.fn(async () => {})
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'stripe-signature': 'test-signature' })),
  cookies: vi.fn(async () => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
    setAll: vi.fn(),
    delete: vi.fn()
  }))
}))

describe('Payment ↔ Booking Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_your_key'
    process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_webhook_secret'

    const quote = {
      id: 'test-quote-id',
      user_id: 'test-user-id',
      price_cents: 1000,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      candidates: [{ id: 'test-provider-id' }]
    }

    const booking = {
      id: 'booking-1',
      state: 'hold_placed',
      provider_id: 'test-provider-id',
      quote_id: 'test-quote-id'
    }

    let outboxCommitted = false

    const bookingsSelect = {
      eq: vi.fn((column: string) => {
        if (column === 'idempotency_key') {
          return {
            single: vi.fn(async () => ({ data: null, error: null }))
          }
        }

        if (column === 'stripe_payment_intent_id') {
          return {
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: booking, error: null }))
            }))
          }
        }

        return {
          single: vi.fn(async () => ({ data: null, error: null }))
        }
      })
    }

    const bookingsInsert = {
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: booking, error: null }))
      }))
    }

    const bookingsUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null }))
      }))
    }))

    const paymentsOutboxSelectCommitted = {
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: outboxCommitted ? { id: 'outbox-1', status: 'committed' } : null,
            error: null
          }))
        }))
      }))
    }

    const paymentsOutboxInsert = vi.fn(async () => ({ error: null }))
    const paymentsOutboxUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => {
          outboxCommitted = true
          return { error: null }
        })
      }))
    }))

    supabaseAdminMock.from.mockImplementation((table: string) => {
      if (table === 'system_flags') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { value: true }, error: null }))
            }))
          }))
        }
      }

      if (table === 'bookings') {
        return {
          select: vi.fn(() => bookingsSelect),
          insert: vi.fn(() => bookingsInsert),
          update: bookingsUpdate,
          eq: vi.fn(() => bookingsSelect)
        } as any
      }

      if (table === 'quotes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gt: vi.fn(() => ({
                single: vi.fn(async () => ({ data: quote, error: null }))
              }))
            }))
          }))
        } as any
      }

      if (table === 'payments_outbox') {
        return {
          select: vi.fn(() => paymentsOutboxSelectCommitted),
          insert: vi.fn(() => ({ then: (resolve: any) => Promise.resolve({ error: null }).then(resolve) })),
          update: paymentsOutboxUpdate,
          eq: vi.fn(() => paymentsOutboxSelectCommitted),
          single: vi.fn(async () => ({ data: null, error: null }))
        } as any
      }

      if (table === 'booking_audit_log') {
        return {
          insert: vi.fn(async () => ({ error: null }))
        } as any
      }

      if (table === 'availability_slots') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(async () => ({ error: null }))
              }))
            }))
          }))
        } as any
      }

      return {}
    })

    // Allow tests to inspect update calls.
    ;(globalThis as any).__bookingsUpdateMock = bookingsUpdate
  })

  describe('Cannot create booking hold with fake payment intent', () => {
    it('rejects booking creation with non-existent payment intent', async () => {
      stripeRetrieveMock.mockRejectedValueOnce(new Error('No such payment_intent'))

      const req = new NextRequest(
        new Request('http://localhost:3000/api/bookings/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: 'test-quote-id',
            provider_id: 'test-provider-id',
            stripe_payment_intent_id: 'pi_fake_12345',
            idempotency_key: 'test-key-1'
          })
        })
      )

      const { POST } = await import('@/app/api/bookings/confirm/route')
      const response = await POST(req)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('INVALID_PAYMENT_INTENT')
    })

    it('rejects booking creation with payment intent in wrong state', async () => {
      stripeRetrieveMock.mockResolvedValueOnce({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 1000,
        currency: 'usd'
      })

      const req = new NextRequest(
        new Request('http://localhost:3000/api/bookings/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: 'test-quote-id',
            provider_id: 'test-provider-id',
            stripe_payment_intent_id: 'pi_test_123',
            idempotency_key: 'test-key-2'
          })
        })
      )

      const { POST } = await import('@/app/api/bookings/confirm/route')
      const response = await POST(req)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('INVALID_PAYMENT_INTENT_STATE')
    })

    it('rejects booking creation with payment intent amount mismatch', async () => {
      stripeRetrieveMock.mockResolvedValueOnce({
        id: 'pi_test_123',
        status: 'requires_confirmation',
        amount: 500,
        currency: 'usd'
      })

      const req = new NextRequest(
        new Request('http://localhost:3000/api/bookings/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: 'test-quote-id',
            provider_id: 'test-provider-id',
            stripe_payment_intent_id: 'pi_test_123',
            idempotency_key: 'test-key-3'
          })
        })
      )

      const { POST } = await import('@/app/api/bookings/confirm/route')
      const response = await POST(req)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('PAYMENT_AMOUNT_MISMATCH')
    })
  })

  describe('Duplicate webhooks are idempotent', () => {
    it('handles duplicate payment_intent.succeeded webhooks gracefully', async () => {
      stripeConstructEventMock.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 1000,
            currency: 'usd'
          }
        }
      })

      const { POST } = await import('@/app/api/webhooks/stripe/route')

      const req1 = new NextRequest(
        new Request('http://localhost:3000/api/webhooks/stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ any: 'payload' })
        })
      )
      const res1 = await POST(req1)
      expect(res1.status).toBe(200)

      const req2 = new NextRequest(
        new Request('http://localhost:3000/api/webhooks/stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ any: 'payload' })
        })
      )
      const res2 = await POST(req2)
      expect(res2.status).toBe(200)

      const bookingsUpdateMock = (globalThis as any).__bookingsUpdateMock as ReturnType<typeof vi.fn>
      expect(bookingsUpdateMock).toHaveBeenCalledTimes(1)
    })
  })
})
