import { describe, it, expect, vi, Mock } from 'vitest'
import { GET } from '@/app/api/analytics/system/route'

// Mock Supabase client with predefined query results
const totalEvents = 120
const errorEvents = 5
const eventRows = [
  { properties: { user_id: 'u1', session_duration: 20 } },
  { properties: { user_id: 'u2', session_duration: 40 } },
  { properties: { user_id: 'u1', session_duration: 10 } }
]

interface MockBuilder<T> {
  select: Mock;
  gte: Mock;
  lte: Mock;
  eq: Mock;
  then: (resolve: (value: T) => void) => Promise<void>;
}

function createBuilder<T>(result: T): MockBuilder<T> {
  const builder: Partial<MockBuilder<T>> = {}
  const chain = () => builder as MockBuilder<T>
  builder.select = vi.fn(chain)
  builder.gte = vi.fn(chain)
  builder.lte = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.then = (resolve: (value: T) => void) => Promise.resolve(result).then(resolve)
  return builder as MockBuilder<T>
}

const builders: Array<MockBuilder<unknown>> = [
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
    const res = await GET()
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
