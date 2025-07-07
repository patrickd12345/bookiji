import { describe, it, expect, vi } from 'vitest'
import { POST } from '@/app/api/analytics/track/route'
import { NextRequest } from 'next/server'

const sbMocks = vi.hoisted(() => ({
  insert: vi.fn(async () => ({ error: null })),
  upsert: vi.fn(async () => ({ error: null })),
  from: vi.fn(),
  rpc: vi.fn(async () => ({ error: null }))
}))

vi.mock('@/lib/supabaseClient', () => {
  const builder: any = {}
  builder.insert = sbMocks.insert
  builder.upsert = sbMocks.upsert
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.single = vi.fn(async () => ({ data: {}, error: null }))
  builder.gte = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.limit = vi.fn(() => builder)

  sbMocks.from.mockReturnValue(builder)

  return {
    createSupabaseClient: () => ({ 
      from: sbMocks.from, 
      rpc: sbMocks.rpc 
    })
  }
})

// Mock the supabase import directly
vi.mock('@/lib/supabaseClient', () => ({
  createSupabaseClient: () => ({
    from: (table: string) => ({
      insert: sbMocks.insert,
      upsert: sbMocks.upsert,
      select: () => ({
        eq: () => ({
          single: async () => ({ data: {}, error: null })
        })
      }),
      rpc: sbMocks.rpc
    }),
    rpc: sbMocks.rpc
  })
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
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(sbMocks.insert).toHaveBeenCalled()
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
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(sbMocks.upsert).toHaveBeenCalled()
  })
})
