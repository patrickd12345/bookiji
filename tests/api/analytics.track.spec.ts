/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest'
import { POST } from '@/app/api/analytics/track/route'
import { NextRequest } from 'next/server'

const sbMocks: any = {}

vi.mock('@/lib/supabaseClient', () => {
  const builder: any = {}
  sbMocks.insert = vi.fn(async () => ({ error: null }))
  sbMocks.upsert = vi.fn(async () => ({ error: null }))
  builder.insert = sbMocks.insert
  builder.upsert = sbMocks.upsert
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.single = vi.fn(async () => ({ data: {}, error: null }))
  builder.gte = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.limit = vi.fn(() => builder)

  sbMocks.from = vi.fn(() => builder)
  sbMocks.rpc = vi.fn(async () => ({ error: null }))

  return {
    createSupabaseClient: () => ({ from: sbMocks.from, rpc: sbMocks.rpc })
  }
})

const BASE_URL = 'http://localhost:3000'

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
    expect(sbMocks.from).toHaveBeenCalledWith('analytics_events')
    expect(sbMocks.insert).toHaveBeenCalled()
  })
})
