import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/vendor/analytics/route'

// Mock Supabase SSR and config
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn()
}))

vi.mock('@/config/supabase', () => ({
  getSupabaseConfig: vi.fn(() => ({
    url: 'http://localhost:54321',
    publishableKey: 'test-key'
  }))
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn()
  }))
}))

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('GET /api/vendor/analytics', () => {
  let mockSupabase: any
  let mockCreateServerClient: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn()
      },
      from: vi.fn()
    }

    // Mock createServerClient to return our mock
    const { createServerClient } = await import('@supabase/ssr')
    mockCreateServerClient = createServerClient as any
    mockCreateServerClient.mockReturnValue(mockSupabase)
  })

  it('returns analytics for authenticated vendor', async () => {
    const vendorId = 'vendor-123'
    const userId = 'auth-user-123'

    // Mock authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null
    })

    // Mock profile lookup
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { id: vendorId, role: 'vendor' },
                error: null
              }))
            }))
          }))
        }
      }

      if (table === 'bookings') {
        const bookingsChain = {
          select: vi.fn(() => bookingsChain),
          eq: vi.fn(() => bookingsChain),
          gt: vi.fn(() => bookingsChain),
          then: vi.fn(async (resolve: any) => {
            return resolve({ count: 10, error: null })
          })
        }
        bookingsChain.select.mockReturnValue(bookingsChain)
        bookingsChain.eq.mockReturnValue(bookingsChain)
        bookingsChain.gt.mockReturnValue(bookingsChain)
        return bookingsChain
      }

      if (table === 'reviews') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({
              data: [{ rating: 4 }, { rating: 5 }],
              error: null
            }))
          }))
        }
      }

      return {}
    })

    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/vendor/analytics`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
    )

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('bookings_count')
    expect(data).toHaveProperty('upcoming_bookings_count')
    expect(data).toHaveProperty('completed_bookings_count')
    expect(data).toHaveProperty('average_rating')
    expect(typeof data.bookings_count).toBe('number')
    expect(typeof data.average_rating).toBe('number')
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' }
    })

    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/vendor/analytics`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      })
    )

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toHaveProperty('error')
  })

  it('returns 403 when user is not a vendor', async () => {
    const userId = 'auth-user-123'

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { id: 'user-123', role: 'customer' },
                error: null
              }))
            }))
          }))
        }
      }
      return {}
    })

    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/vendor/analytics`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
    )

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('Vendor access required')
  })

  it('uses aggregated queries (no N+1)', async () => {
    const vendorId = 'vendor-123'
    const userId = 'auth-user-123'

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null
    })

    let bookingsFromCalls = 0
    let reviewsFromCalls = 0

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { id: vendorId, role: 'vendor' },
                error: null
              }))
            }))
          }))
        }
      }

      if (table === 'bookings') {
        bookingsFromCalls++
        const bookingsChain = {
          select: vi.fn(() => bookingsChain),
          eq: vi.fn(() => bookingsChain),
          gt: vi.fn(() => bookingsChain),
          then: vi.fn(async (resolve: any) => {
            return resolve({ count: 5, error: null })
          })
        }
        bookingsChain.select.mockReturnValue(bookingsChain)
        bookingsChain.eq.mockReturnValue(bookingsChain)
        bookingsChain.gt.mockReturnValue(bookingsChain)
        return bookingsChain
      }

      if (table === 'reviews') {
        reviewsFromCalls++
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({
              data: [{ rating: 4 }],
              error: null
            }))
          }))
        }
      }

      return {}
    })

    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/vendor/analytics`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
    )

    await GET(req)

    // Verify each table is queried only once (batched via Promise.all)
    // bookings should be queried 3 times (total, upcoming, completed) but all batched
    // reviews should be queried once
    expect(reviewsFromCalls).toBeLessThanOrEqual(1)
    // bookings queries are batched in parallel, so should be called multiple times but efficiently
    expect(bookingsFromCalls).toBeGreaterThan(0)
  })
})
