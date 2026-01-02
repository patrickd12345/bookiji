import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/vendor/settings/route'
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

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn()
  }))
}))

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('GET /api/vendor/settings', () => {
  let mockCreateServerClient: any

  beforeEach(async () => {
    vi.clearAllMocks()

    const { createServerClient } = await import('@supabase/ssr')
    mockCreateServerClient = createServerClient as any
    mockCreateServerClient.mockReturnValue(getSupabaseMock())
  })

  it('returns settings for authenticated vendor', async () => {
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
                data: {
                  id: vendorId,
                  role: 'vendor',
                  preferences: {
                    timezone: 'America/New_York',
                    email_enabled: true
                  }
                },
                error: null
              }))
            }))
          }))
        }
      }
      return baseFrom(table)
    })

    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/vendor/settings`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
    )

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('timezone')
    expect(data).toHaveProperty('notification_preferences')
    expect(data).toHaveProperty('visibility_flags')
    expect(data.timezone).toBe('America/New_York')
    expect(data.notification_preferences.email_enabled).toBe(true)
  })

  it('returns defaults when preferences do not exist', async () => {
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
                data: {
                  id: vendorId,
                  role: 'vendor',
                  preferences: null
                },
                error: null
              }))
            }))
          }))
        }
      }
      return baseFrom(table)
    })

    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/vendor/settings`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
    )

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.timezone).toBe('UTC') // Default
    expect(data.notification_preferences.email_enabled).toBe(true) // Default
    expect(data.visibility_flags.profile_public).toBe(true) // Default
  })

  it('returns 401 when not authenticated', async () => {
    const supabase = getSupabaseMock()
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' }
    })

    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/vendor/settings`, {
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
      new Request(`${TEST_BASE_URL}/api/vendor/settings`, {
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
})
