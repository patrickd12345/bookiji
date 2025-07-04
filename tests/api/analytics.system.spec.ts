/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/analytics/system/route'

const BASE_URL = process.env.TEST_BASE_URL || ''

// Mock Supabase client with predefined query results
const totalEvents = 120
const errorEvents = 5
const eventRows = [
  { properties: { user_id: 'u1', session_duration: 20 } },
  { properties: { user_id: 'u2', session_duration: 40 } },
  { properties: { user_id: 'u1', session_duration: 10 } }
]

function createBuilder(result: any) {
  const builder: any = {}
  builder.select = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  builder.lte = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.then = (resolve: any) => Promise.resolve(result).then(resolve)
  return builder
}

const builders = [
  createBuilder({ count: totalEvents }),
  createBuilder({ count: errorEvents }),
  createBuilder({ data: eventRows })
]
let callIndex = 0
const fromMock = vi.fn(() => builders[callIndex++])

vi.mock('@/lib/supabaseClient', () => ({
  createSupabaseClient: () => ({ from: fromMock })
}))

describe('GET /api/analytics/system', () => {
  it('returns aggregated system metrics', async () => {
    const req = new Request(`${BASE_URL}/api/analytics/system`, { method: 'GET' })
    const res = await GET(req as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(typeof data.data).toBe('object')
    expect(data.data).toHaveProperty('requestsPerMinute')
    expect(data.data).toHaveProperty('p95SessionDuration')
    expect(data.data).toHaveProperty('errorRate')
    expect(data.data).toHaveProperty('activeUsers')
    expect(fromMock).toHaveBeenCalledTimes(3)
  })
})
