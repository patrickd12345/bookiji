import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getSupabaseMock } from '../utils/supabase-mocks'

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) }))
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => getSupabaseMock())
}))

vi.mock('@/config/supabase', () => ({
  getSupabaseConfig: vi.fn(() => ({ url: 'http://example.com', publishableKey: 'public' }))
}))

const mkReq = (body: Record<string, unknown>) => new NextRequest(
  new Request('https://example.com/api/ratings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
)

describe('POST /api/ratings', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.resetModules()
    const supabase = getSupabaseMock()
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null } as any)
    const { POST } = await import('@/app/api/ratings/route')
    const res = await POST(mkReq({ booking_id: 'b1', stars: 4 }) as unknown as NextRequest)
    expect(res.status).toBe(401)
  })

  it('validates required fields', async () => {
    vi.resetModules()
    const supabase = getSupabaseMock()
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as any)
    const { POST } = await import('@/app/api/ratings/route')
    const res = await POST(mkReq({}) as unknown as NextRequest)
    expect(res.status).toBe(400)
  })

  it('does not mutate booking status when submitting ratings', async () => {
    vi.resetModules()
    const supabase = getSupabaseMock()
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as any)

    const updateSpy = vi.fn()

    supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 'profile-1', role: 'customer' }, error: null }))
            }))
          }))
        } as any
      }
      if (table === 'bookings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { id: 'booking-1', status: 'confirmed', customer_id: 'profile-1', vendor_id: 'vendor-1' },
                error: null
              }))
            }))
          })),
          update: updateSpy
        } as any
      }
      if (table === 'ratings') {
        const eqChain = {
          eq: vi.fn(() => eqChain),
          maybeSingle: vi.fn(async () => ({ data: null, error: null }))
        }
        return {
          select: vi.fn(() => eqChain),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 'rating-1', stars: 4 }, error: null }))
            }))
          }))
        } as any
      }
      if (table === 'analytics_events') {
        return {
          insert: vi.fn(async () => ({ data: null, error: null }))
        } as any
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: null })) })) })) } as any
    })

    const { POST } = await import('@/app/api/ratings/route')
    const res = await POST(mkReq({ booking_id: 'booking-1', stars: 4 }) as unknown as NextRequest)
    expect(res.status).toBe(200)
    expect(updateSpy).not.toHaveBeenCalled()
  })
})
