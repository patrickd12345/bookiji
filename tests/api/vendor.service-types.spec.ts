import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/vendor/service-types/route'
import { getSupabaseMock } from '../utils/supabase-mocks'

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

vi.mock('@/lib/supabaseServerClient', () => ({
  createSupabaseServerClient: vi.fn(() => getSupabaseMock())
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn()
  }))
}))

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('GET /api/vendor/service-types', () => {
  let mockCreateServerClient: any

  beforeEach(async () => {
    vi.clearAllMocks()

    const { createServerClient } = await import('@supabase/ssr')
    mockCreateServerClient = createServerClient as any

    const shared = getSupabaseMock()
    mockCreateServerClient.mockReturnValue(shared)
  })

  it('returns service types for authenticated vendor', async () => {
    const vendorId = 'vendor-123'
    const userId = 'auth-user-123'
    const supabase = getSupabaseMock()
    const baseFrom = supabase.from.getMockImplementation?.() ?? ((table: string) => ({} as any))

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null
    })

    supabase.from.mockImplementation((table: string) => {
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

      if (table === 'services') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: [
                    { category: 'Haircut' },
                    { category: 'Haircut' },
                    { category: 'Coloring' },
                    { category: 'Styling' }
                  ],
                  error: null
                }))
              }))
            }))
          }))
        }
      }

      return baseFrom(table)
    })

    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/vendor/service-types`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
    )

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('service_types')
    expect(Array.isArray(data.service_types)).toBe(true)
    // Should be deduplicated and sorted
    expect(data.service_types).toEqual(['Coloring', 'Haircut', 'Styling'])
  })

  it('returns empty array when vendor has no services', async () => {
    const vendorId = 'vendor-123'
    const userId = 'auth-user-123'
    const supabase = getSupabaseMock()
    const baseFrom = supabase.from.getMockImplementation?.() ?? ((table: string) => ({} as any))

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null
    })

    supabase.from.mockImplementation((table: string) => {
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

      if (table === 'services') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: [],
                  error: null
                }))
              }))
            }))
          }))
        }
      }

      return baseFrom(table)
    })

    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/vendor/service-types`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
    )

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.service_types).toEqual([])
  })

  it('returns 401 when not authenticated', async () => {
    const supabase = getSupabaseMock()
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' }
    })

    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/vendor/service-types`, {
        method: 'GET'
      })
    )

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toHaveProperty('error')
  })

  it('returns 403 when user is not a vendor', async () => {
    const userId = 'auth-user-123'
    const supabase = getSupabaseMock()
    const baseFrom = supabase.from.getMockImplementation?.() ?? ((table: string) => ({} as any))

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null
    })

    supabase.from.mockImplementation((table: string) => {
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
      return baseFrom(table)
    })

    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/vendor/service-types`, {
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

  it('queries services table only once (no N+1)', async () => {
    const vendorId = 'vendor-123'
    const userId = 'auth-user-123'
    let servicesFromCalls = 0
    const supabase = getSupabaseMock()
    const baseFrom = supabase.from.getMockImplementation?.() ?? ((table: string) => ({} as any))

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null
    })

    supabase.from.mockImplementation((table: string) => {
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

      if (table === 'services') {
        servicesFromCalls++
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: [{ category: 'Haircut' }],
                  error: null
                }))
              }))
            }))
          }))
        }
      }

      return baseFrom(table)
    })

    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/vendor/service-types`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
    )

    await GET(req)

    // Verify services table is queried exactly once
    expect(servicesFromCalls).toBe(1)
  })
})
