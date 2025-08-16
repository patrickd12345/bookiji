import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/analytics/track/route'
import { NextRequest } from 'next/server'

// Set up environment variables
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})

const sbMocks = vi.hoisted(() => ({
  insert: vi.fn(async () => ({ data: [{ id: 'test-id' }], error: null })),
  upsert: vi.fn(async () => ({ data: [{ id: 'test-id' }], error: null })),
  rpc: vi.fn(async () => ({ data: null, error: null })),
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: async () => ({ data: { completed_bookings: 0, session_duration: 0, help_clicks: 0, signup_abandoned: false, payment_abandoned: false, pricing_page_visits: 0, session_count: 0 }, error: null })
    }))
  }))
}))

// Mock Supabase createClient
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      insert: sbMocks.insert,
      upsert: sbMocks.upsert,
      select: sbMocks.select
    }),
    rpc: sbMocks.rpc
  })
}))

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
