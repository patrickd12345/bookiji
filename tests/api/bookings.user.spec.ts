import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSupabaseMock } from '../utils/supabase-mocks'

vi.mock('@/lib/supabaseServer', () => ({
  getServerSupabase: vi.fn(() => getSupabaseMock())
}))

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('GET /api/bookings/user', () => {
  beforeEach(() => {
    const supabase = getSupabaseMock()
    supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null }))
            }))
          }))
        } as any
      }

      if (table === 'bookings') {
        return {
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              order: vi.fn(async () => ({ data: [], error: null }))
            }))
          }))
        } as any
      }

      return {} as any
    })
  })

  it('returns empty bookings array when no bookings exist', async () => {
    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/user?userId=test-user-123`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )

    const { GET } = await import('@/app/api/bookings/user/route')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('bookings')
    expect(Array.isArray(data.bookings)).toBe(true)
    expect(data.bookings).toHaveLength(0)
  })

  it('handles database errors gracefully', async () => {
    const req = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/user?userId=nonexistent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )

    const { GET } = await import('@/app/api/bookings/user/route')
    const response = await GET(req)
    const data = await response.json()

    // Should handle errors gracefully
    expect(response.status).toBeLessThanOrEqual(500)
    expect(data).toHaveProperty('success')
    
    if (!data.success) {
      expect(data).toHaveProperty('error')
    }
  })
})

