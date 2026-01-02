import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSupabaseMock } from '../../utils/supabase-mocks'

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => getSupabaseMock())
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => getSupabaseMock())
}))

vi.mock('stripe', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    paymentIntents: {
      create: vi.fn(async () => ({
        id: 'pi_mock',
        client_secret: 'cs_mock',
      })),
      retrieve: vi.fn(async () => ({
        id: 'pi_existing',
        client_secret: 'cs_existing',
      })),
    },
  })),
}))

/**
 * Layer 2: API E2E Tests - Concurrency & Race Conditions
 * 
 * Tests that simultaneous booking attempts for the same slot
 * are handled correctly (only one succeeds, others return 409).
 */
describe('Concurrency Tests - Layer 2: API E2E (System Truth)', () => {
  beforeEach(() => {
    const mock = getSupabaseMock()
    vi.clearAllMocks()
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null } as any)
  })

  it('rejects simultaneous booking attempts for same slot', async () => {
    const now = new Date()
    const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000)

    const bookingData = {
      providerId: 'test-provider-123',
      serviceId: 'test-service-123',
      startTime: futureStart.toISOString(),
      endTime: futureEnd.toISOString(),
      amountUSD: 25
    }

    // Simulate two concurrent requests
    const request1 = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })
    )

    const request2 = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })
    )

    const { POST } = await import('@/app/api/bookings/create/route')
    
    // Execute requests (simulating concurrency)
    const [response1, response2] = await Promise.all([
      POST(request1),
      POST(request2)
    ])

    // At least one should succeed, at least one should fail with conflict
    const statuses = [response1.status, response2.status]
    expect(statuses).toContain(200) // At least one succeeds
    expect(statuses.some(s => s === 409 || s === 400)).toBe(true) // At least one detects conflict
  })

  it('handles idempotency key reuse correctly', async () => {
    const idempotencyKey = 'test-idempotency-key-123'
    const now = new Date()
    const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000)

    const bookingData = {
      providerId: 'test-provider-123',
      serviceId: 'test-service-123',
      startTime: futureStart.toISOString(),
      endTime: futureEnd.toISOString(),
      amountUSD: 25,
      idempotencyKey
    }

    const mock = getSupabaseMock()
    const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))

    const existingBooking = {
      id: 'existing-booking-id',
      idempotency_key: idempotencyKey
    }

    // Mock idempotency check - always return existing booking
    mock.from.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: existingBooking,
                error: null
              })
            })
          })
        }
      }
      return baseFrom(table)
    })

    const request1 = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })
    )

    const request2 = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })
    )

    const { POST } = await import('@/app/api/bookings/create/route')
    
    const [response1, response2] = await Promise.all([
      POST(request1),
      POST(request2)
    ])

    // Both should return the same existing booking (idempotent)
    const data1 = await response1.json()
    const data2 = await response2.json()

    expect(response1.status).toBe(200)
    expect(response2.status).toBe(200)
    expect(data1.booking.id).toBe(existingBooking.id)
    expect(data2.booking.id).toBe(existingBooking.id)
    expect(data1.duplicate).toBe(true)
    expect(data2.duplicate).toBe(true)
  })
})
