import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseMock } from '../utils/supabase-mocks'

// Mock Supabase client BEFORE importing route handler
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => getSupabaseMock())
}))

beforeEach(() => {
  const supabase = getSupabaseMock()
  supabase.rpc.mockResolvedValue({ error: null } as any)
  supabase.from.mockImplementation((table: string) => {
    if (table === 'analytics_events') {
      return { insert: vi.fn(async () => ({ error: null })) } as any
    }
    if (table === 'user_analytics') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: {
                completed_bookings: 3,
                session_duration: 700,
                help_clicks: 4,
                payment_abandoned: false,
                pricing_page_visits: 5,
                session_count: 3
              },
              error: null
            }))
          }))
        }))
      } as any
    }
    if (table === 'user_segments') {
      return { upsert: vi.fn(async () => ({ error: null })) } as any
    }
    return {} as any
  })
})

import { POST } from '@/app/api/analytics/track/route'

type AnalyticsRequestBody = {
  event: string
  properties?: Record<string, unknown>
}

const mkReq = (body: AnalyticsRequestBody) => new Request('https://example.com/api/analytics/track', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'user-agent': 'Vitest' },
  body: JSON.stringify(body)
})

import { NextRequest } from 'next/server'

describe('analytics segmentation/geographic branches', () => {
  it('invokes segmentation and geographic branches safely', async () => {
    // Patch Request to NextRequest for compatibility
    const req = mkReq({ event: 'signup_completed', properties: { user_id: 'u1', country: 'DE' } }) as unknown as NextRequest
    const res = await POST(req)
    expect(res?.status).toBe(200)
  })
})

