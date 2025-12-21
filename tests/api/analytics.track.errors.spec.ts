import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/analytics/track/route'
import { NextRequest } from 'next/server'

type AnalyticsRequestBody = {
  event?: string
  properties?: Record<string, unknown>
}

const mkReq = (body: AnalyticsRequestBody) => new Request('https://example.com/api/analytics/track', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'user-agent': 'Vitest UA' },
  body: JSON.stringify(body)
})

const supabaseMockState = (globalThis as any).__supabaseMockState

describe('POST /api/analytics/track (error paths)', () => {
  it('400 when missing event', async () => {
    const res = await POST(mkReq({}) as unknown as NextRequest)
    expect(res?.status).toBe(400)
  })

  it('500 when storage fails', async () => {
    supabaseMockState.insertErrors.add('analytics_events')
    const res = await POST(mkReq({ event: 'test_event', properties: {} }) as unknown as NextRequest)
    expect(res).toBeTruthy()
    const json = await res!.json()
    expect(res!.status).toBe(500)
    expect(json.error).toBeTruthy()
  })
})

