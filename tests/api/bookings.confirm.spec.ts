import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSupabaseMock } from '../utils/supabase-mocks'

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => getSupabaseMock())
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => getSupabaseMock())
}))

// Create a mock that works with the Proxy pattern
const mockSupabaseAdmin = getSupabaseMock()
vi.mock('@/lib/supabaseProxies', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  getSupabaseAdmin: () => mockSupabaseAdmin
}))

// Mock Stripe
vi.mock('stripe', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    paymentIntents: {
      retrieve: vi.fn(async (id: string) => {
        if (id === 'pi_valid') {
          return {
            id: 'pi_valid',
            status: 'requires_confirmation',
            amount: 100,
            currency: 'usd',
            client_secret: 'cs_valid'
          }
        }
        throw new Error('Payment intent not found')
      })
    }
  }))
}))

// Mock feature flags
vi.mock('@/config/featureFlags', () => ({
  featureFlags: {
    beta: {
      core_booking_flow: true
    },
    payments: {
      hold_amount_cents: 100,
      hold_timeout_minutes: 15
    }
  }
}))

// Mock guards
vi.mock('@/lib/guards/schedulingKillSwitch', () => ({
  assertSchedulingEnabled: vi.fn(async () => {}),
  SchedulingDisabledError: class extends Error {
    code = 'SCHEDULING_DISABLED'
    statusCode = 503
  }
}))

vi.mock('@/lib/guards/subscriptionGuard', () => ({
  assertVendorHasActiveSubscription: vi.fn(async () => {}),
  SubscriptionRequiredError: class extends Error {
    message = 'Vendor subscription required'
  }
}))

// Mock middleware
vi.mock('@/middleware/sloProbe', () => ({
  withSLOProbe: (handler: any) => handler
}))

describe('POST /api/bookings/confirm - Layer 2: API E2E Tests (System Truth)', () => {
  beforeEach(() => {
    const mock = getSupabaseMock()
    // Keep the shared mock's default `from()` behavior intact.
    // Individual tests override `from()` with a table-switch implementation.
    vi.clearAllMocks()
  })

  it('creates booking with hold_placed state', async () => {
    const mock = getSupabaseMock()
    const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
    
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const quoteId = 'quote_123'
    const providerId = 'provider_123'
    const idempotencyKey = 'idempotency_key_123'

    // Use a table-based implementation to avoid call-order brittleness.
    mock.from.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'booking_123',
                    customer_id: 'user_123',
                    provider_id: providerId,
                    quote_id: quoteId,
                    state: 'hold_placed',
                    price_cents: 100,
                    stripe_payment_intent_id: 'pi_valid',
                    idempotency_key: idempotencyKey,
                    hold_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                  },
                  error: null,
                }),
            }),
          }),
        }
      }

      if (table === 'quotes') {
        return {
          select: () => ({
            eq: () => ({
              gt: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: quoteId,
                      user_id: 'user_123',
                      price_cents: 100,
                      start_time: futureDate.toISOString(),
                      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                      candidates: [{ id: providerId }],
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        }
      }

      if (table === 'payments_outbox') {
        return {
          insert: () => Promise.resolve({ error: null }),
        }
      }

      if (table === 'booking_audit_log') {
        return {
          insert: () => Promise.resolve({ error: null }),
        }
      }

      return baseFrom(table)
    })

    const mockRequest = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: quoteId,
          provider_id: providerId,
          stripe_payment_intent_id: 'pi_valid',
          idempotency_key: idempotencyKey
        })
      })
    )

    const { POST } = await import('@/app/api/bookings/confirm/route')
    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.booking_id).toBe('booking_123')
    expect(data.data.state).toBe('hold_placed')
    expect(data.data.payment_status).toBe('hold_placed')
  })

  it('returns 409 for duplicate idempotency key', async () => {
    const mock = getSupabaseMock()
    const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
    
    const idempotencyKey = 'duplicate_key'

    mock.from.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'existing_booking_123', idempotency_key: idempotencyKey },
                  error: null,
                }),
            }),
          }),
        }
      }

      return baseFrom(table)
    })

    const mockRequest = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: 'quote_123',
          provider_id: 'provider_123',
          stripe_payment_intent_id: 'pi_valid',
          idempotency_key: idempotencyKey
        })
      })
    )

    const { POST } = await import('@/app/api/bookings/confirm/route')
    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('IDEMPOTENT_DUPLICATE')
    expect(data.data.booking_id).toBe('existing_booking_123')
  })

  it('returns 400 for expired quote', async () => {
    const mock = getSupabaseMock()
    const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
    
    const quoteId = 'expired_quote'

    mock.from.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }
      }

      if (table === 'quotes') {
        return {
          select: () => ({
            eq: () => ({
              gt: () => ({
                single: () =>
                  Promise.resolve({
                    data: null,
                    error: { code: 'PGRST116', message: 'Not found' },
                  }),
              }),
            }),
          }),
        }
      }

      return baseFrom(table)
    })

    const mockRequest = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: quoteId,
          provider_id: 'provider_123',
          stripe_payment_intent_id: 'pi_valid',
          idempotency_key: 'key_123'
        })
      })
    )

    const { POST } = await import('@/app/api/bookings/confirm/route')
    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/expired|not found/i)
  })

  it('returns 400 for missing required fields', async () => {
    const mockRequest = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: 'quote_123'
          // Missing provider_id, stripe_payment_intent_id, idempotency_key
        })
      })
    )

    const { POST } = await import('@/app/api/bookings/confirm/route')
    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/Missing required fields/i)
  })

  it('rejects bookings in the past', async () => {
    const mock = getSupabaseMock()
    const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
    
    const pastDate = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    const quoteId = 'quote_past'

    mock.from.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }
      }

      if (table === 'quotes') {
        return {
          select: () => ({
            eq: () => ({
              gt: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: quoteId,
                      user_id: 'user_123',
                      price_cents: 100,
                      start_time: pastDate.toISOString(), // Past date
                      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                      candidates: [{ id: 'provider_123' }],
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        }
      }

      return baseFrom(table)
    })

    const mockRequest = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: quoteId,
          provider_id: 'provider_123',
          stripe_payment_intent_id: 'pi_valid',
          idempotency_key: 'key_123'
        })
      })
    )

    const { POST } = await import('@/app/api/bookings/confirm/route')
    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/past/i)
  })
})
