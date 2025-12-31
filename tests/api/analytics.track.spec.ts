import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/analytics/track/route'
import { NextRequest } from 'next/server'
import { getSupabaseMock } from '../utils/supabase-mocks'

const sbMocks = vi.hoisted(() => ({
  insert: vi.fn(async () => ({ data: [{ id: 'test-id' }], error: null })),
  upsert: vi.fn(async () => ({ data: [{ id: 'test-id' }], error: null })),
  rpc: vi.fn(async () => ({ data: null, error: null })),
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: async () => ({
        data: {
          completed_bookings: 0,
          session_duration: 0,
          help_clicks: 0,
          signup_abandoned: false,
          payment_abandoned: false,
          pricing_page_visits: 0,
          session_count: 0
        },
        error: null
      })
    }))
  }))
}))

// Use shared Supabase mock
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => getSupabaseMock())
}))

// Set up environment variables and Supabase overrides
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key'

  const supabase = getSupabaseMock()
  supabase.rpc.mockImplementation(sbMocks.rpc)
  supabase.from.mockImplementation((table: string) => {
    if (table === 'analytics_events') {
      return { insert: sbMocks.insert } as any
    }
    if (table === 'user_analytics') {
      return { select: sbMocks.select } as any
    }
    if (table === 'user_segments') {
      return { upsert: sbMocks.upsert } as any
    }
    return {} as any
  })
})

// Mock the request limiter
vi.mock('@/middleware/requestLimiter', () => ({
  limitRequest: vi.fn(async () => null)
}))

// Mock the supabase config
vi.mock('@/config/supabase', () => ({
  getSupabaseConfig: vi.fn(() => ({
    url: 'https://test.supabase.co',
    publishableKey: 'test-key'
  }))
}))

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('POST /api/analytics/track', () => {
  it('stores analytics event', async () => {
    const body = { event: 'test_event', properties: { user_id: 'u1' } }
    const req = new NextRequest(
      new Request(`${BASE_URL}/api/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'user-agent': 'jest' },
        body: JSON.stringify(body)
      })
    )

    const res = await POST(req)
    const data = await res!.json()

    expect(res!.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('processes funnel events', async () => {
    const body = { event: 'funnel_booking_start', properties: { user_id: 'u1' } }
    const req = new NextRequest(
      new Request(`${BASE_URL}/api/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'user-agent': 'jest' },
        body: JSON.stringify(body)
      })
    )

    const res = await POST(req)
    const data = await res!.json()

    expect(res!.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
