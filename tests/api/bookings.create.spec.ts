import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSupabaseMock } from '../utils/supabase-mocks'

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: 'mock-session' }))
  }))
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => getSupabaseMock())
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => getSupabaseMock())
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

// Mock Stripe (SDK used by the route)
vi.mock('stripe', () => ({
  default: class Stripe {
    paymentIntents = {
      create: vi.fn(async () => ({ id: 'pi_mock', client_secret: 'cs_mock' }))
    }
    constructor() {}
  }
}))

// Mock is already applied globally via setup.ts

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('POST /api/bookings/create', () => {
  beforeEach(() => {
    const supabase = getSupabaseMock()
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null } as any)
    const baseFrom = supabase.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
    supabase.from.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 'booking-123' }, error: null }))
            }))
          }))
        } as any
      }
      return baseFrom(table)
    })
  })

  it('should create a booking', async () => {
    const bookingData = {
      providerId: 'test-provider-123',
      serviceId: 'test-service-123',
      startTime: '2024-06-01T14:00:00.000Z',
      endTime: '2024-06-01T15:00:00.000Z',
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
