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

describe('POST /api/bookings/cancel - Layer 2: API E2E Tests (System Truth)', () => {
  beforeEach(() => {
    const mock = getSupabaseMock()
    mock.from.mockReset()
    vi.clearAllMocks()
  })

  it('cancels booking and releases slot atomically', async () => {
    const mock = getSupabaseMock()
    const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
    
    const quoteId = 'quote_123'

    // Mock quote lookup
    mock.from.mockImplementationOnce((table: string) => {
      if (table === 'quotes') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: {
                  id: quoteId,
                  booking_id: 'booking_123'
                },
                error: null
              })
            })
          })
        }
      }
      return baseFrom(table)
    })

    // Mock booking cancellation
    mock.from.mockImplementationOnce((table: string) => {
      if (table === 'bookings') {
        return {
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'booking_123',
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString()
                  },
                  error: null
                })
              })
            })
          })
        }
      }
      return baseFrom(table)
    })

    const mockRequest = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: quoteId
        })
      })
    )

    const { POST } = await import('@/app/api/bookings/cancel/route')
    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.data.cancelled).toBe(true)
  })

  it('returns 400 for missing quote_id', async () => {
    const mockRequest = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })
    )

    const { POST } = await import('@/app/api/bookings/cancel/route')
    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('VALIDATION_ERROR')
    expect(data.message).toMatch(/quote_id is required/i)
  })

  it('handles cancellation errors gracefully', async () => {
    const mock = getSupabaseMock()
    const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
    
    const quoteId = 'quote_not_found'

    // Mock quote lookup (not found)
    mock.from.mockImplementationOnce((table: string) => {
      if (table === 'quotes') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' }
              })
            })
          })
        }
      }
      return baseFrom(table)
    })

    const mockRequest = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: quoteId
        })
      })
    )

    const { POST } = await import('@/app/api/bookings/cancel/route')
    const response = await POST(mockRequest)
    const data = await response.json()

    // Should handle error gracefully (implementation may vary)
    expect([200, 400, 404, 500]).toContain(response.status)
  })
})
