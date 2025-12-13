import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/analytics/track/route'
import { getSupabaseMock } from '../utils/supabase-mocks'

type AnalyticsRequestBody = {
  event?: string
  properties?: Record<string, unknown>
}

const mkReq = (body: AnalyticsRequestBody) => new Request('https://example.com/api/analytics/track', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'user-agent': 'Vitest UA' },
  body: JSON.stringify(body)
})

import { NextRequest } from 'next/server'

// Use shared Supabase mock
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => getSupabaseMock())
}))

beforeEach(() => {
  const supabase = getSupabaseMock()
  supabase.from.mockImplementation(() => ({
    insert: vi.fn(async () => ({ error: { message: 'fail' } }))
  }) as any)
})

describe('POST /api/analytics/track (error paths)', () => {
  it('400 when missing event', async () => {
    const res = await POST(mkReq({}) as unknown as NextRequest)
    expect(res?.status).toBe(400)
  })

  it('500 when storage fails', async () => {
    const res = await POST(mkReq({ event: 'test_event', properties: {} }) as unknown as NextRequest)
    expect(res).toBeTruthy()
    const json = await res!.json()
    expect(res!.status).toBe(500)
    expect(json.error).toBeTruthy()
  })
})

