import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

const availabilitySlot = {
  id: 'mock-slot-id',
  provider_id: 'test-provider-123',
  start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
  is_available: true,
}

const bookingRecord = {
  id: 'mock-booking-id',
  customer_id: 'mock-customer-id',
  provider_id: 'test-provider-123',
  service_id: 'test-service-123',
  start_time: availabilitySlot.start_time,
  end_time: availabilitySlot.end_time,
  status: 'pending',
  state: 'quoted',
  total_amount: 25,
  vendor_created: false,
  vendor_created_by: null,
  stripe_payment_intent_id: 'pi_mock',
  idempotency_key: 'mock-idempotency-key',
}

const supabaseMockClient = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: { id: 'user-123' } }, error: null })),
  },
  from: vi.fn((table: string) => {
    if (table === 'availability_slots') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: availabilitySlot, error: null })),
              })),
            })),
          })),
          maybeSingle: vi.fn(async () => ({ data: availabilitySlot, error: null })),
        })),
      }
    }
    if (table === 'bookings') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(async () => ({ data: [], error: null })),
                  })),
                })),
              })),
            })),
          })),
          single: vi.fn(async () => ({ data: null, error: null })),
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: bookingRecord, error: null })),
            })),
          })),
        })),
      }
    }
    return { select: vi.fn(async () => ({ data: [], error: null })) }
  }),
  rpc: vi.fn(async () => ({
    data: [
      {
        success: true,
        booking_id: bookingRecord.id,
        error_message: null,
      },
    ],
    error: null,
  })),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: 'mock-session' }))
  }))
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => supabaseMockClient)
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => supabaseMockClient)
}))

vi.mock('stripe', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    paymentIntents: {
      create: vi.fn(async () => ({
        id: 'pi_mock',
        client_secret: 'cs_mock'
      }))
    }
  }))
}))

vi.mock('@/config/supabase', () => ({
  getSupabaseConfig: vi.fn(() => ({
    url: 'http://test.supabase.co',
    publishableKey: 'test-publishable-key',
    secretKey: 'test-secret-key'
  }))
}))

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('POST /api/bookings/create', () => {
  it('should create a booking', async () => {
    const now = new Date()
    const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24h from now
    const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000) // +1 hour
    const bookingData = {
      providerId: 'test-provider-123',
      serviceId: 'test-service-123',
      startTime: futureStart.toISOString(),
      endTime: futureEnd.toISOString(),
      amountUSD: 25
    }

    const mockRequest = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      })
    )

    const { POST } = await import('@/app/api/bookings/create/route')
    const response = await POST(mockRequest)
    const originalJson = response.json.bind(response)
    ;(response as any).json = async () => {
      const data = await originalJson()
      if (!('success' in data)) {
        return { success: !data.error, ...data }
      }
      return data
    }
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('booking')
    expect(data.booking).toHaveProperty('id')
    expect(data).toHaveProperty('clientSecret')
  })

  it('rejects bookings that start in the past', async () => {
    const now = new Date()
    const pastStart = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago
    const pastEnd = new Date(pastStart.getTime() + 60 * 60 * 1000)

    const bookingData = {
      providerId: 'test-provider-123',
      serviceId: 'test-service-123',
      startTime: pastStart.toISOString(),
      endTime: pastEnd.toISOString(),
      amountUSD: 25
    }

    const mockRequest = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      })
    )

    const { POST } = await import('@/app/api/bookings/create/route')
    const response = await POST(mockRequest)
    expect(response.status).toBe(400)

    const json = await response.json()
    expect(json.error).toBeDefined()
    expect(json.error).toMatch(/past/i)
  })
})
