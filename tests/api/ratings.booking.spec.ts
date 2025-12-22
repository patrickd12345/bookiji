import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getSupabaseMock } from '../utils/supabase-mocks'

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
  headers: vi.fn(() => new Headers())
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => getSupabaseMock())
}))

vi.mock('@/config/supabase', () => ({
  getSupabaseConfig: vi.fn(() => ({ url: 'http://example.com', publishableKey: 'public' }))
}))

const mkReq = (bookingId: string) =>
  new NextRequest(new Request(`https://example.com/api/ratings/booking/${bookingId}`, {
    method: 'GET',
    headers: { 'accept-language': 'en-US' }
  }))

function stubSupabase(bookingStatus: string) {
  const supabase = getSupabaseMock()
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null } as any)

  const profileChain = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { id: 'profile-1', role: 'customer' }, error: null }))
      }))
    }))
  }

  const bookingChain = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: 'booking-1',
            status: bookingStatus,
            customer_id: 'profile-1',
            vendor_id: 'vendor-1'
          },
          error: null
        }))
      }))
    }))
  }

  const ratingsChain = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(async () => ({ data: [], error: null }))
      }))
    }))
  }

  const analyticsChain = {
    insert: vi.fn(async () => ({ data: null, error: null }))
  }

  supabase.from.mockImplementation((table: string) => {
    if (table === 'profiles') return profileChain as any
    if (table === 'bookings') return bookingChain as any
    if (table === 'ratings') return ratingsChain as any
    if (table === 'analytics_events') return analyticsChain as any
    return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: null })) })) })) } as any
  })
}

describe('GET /api/ratings/booking/:id', () => {
  it('rejects rating prompts before confirmation', async () => {
    vi.resetModules()
    stubSupabase('pending')
    const { GET } = await import('@/app/api/ratings/booking/[bookingId]/route')
    const res = await GET(mkReq('booking-1') as unknown as NextRequest, { params: Promise.resolve({ bookingId: 'booking-1' }) })
    expect(res.status).toBe(403)
  })

  it('allows rating prompts after confirmation', async () => {
    vi.resetModules()
    stubSupabase('confirmed')
    const { GET } = await import('@/app/api/ratings/booking/[bookingId]/route')
    const res = await GET(mkReq('booking-1') as unknown as NextRequest, { params: Promise.resolve({ bookingId: 'booking-1' }) })
    expect(res.status).toBe(200)
  })
})
