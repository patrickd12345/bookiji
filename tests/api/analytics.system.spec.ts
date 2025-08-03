import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/analytics/system/route'

// Mock the createClient function from @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => {
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      gte: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: [
            { event: 'page_view', created_at: '2024-01-16T10:00:00Z' },
            { event: 'booking_start', created_at: '2024-01-16T09:30:00Z' },
            { event: 'page_view', created_at: '2024-01-16T09:00:00Z' }
          ],
          error: null
        }))
      }))
    }))
  }))

  const mockClient = {
    from: mockFrom
  }

  return {
    createClient: vi.fn(() => mockClient)
  }
})

describe('GET /api/analytics/system', () => {
  it('returns aggregated system metrics', async () => {
    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(typeof data.metrics).toBe('object')
    expect(data.metrics).toHaveProperty('totalEvents')
    expect(data.metrics).toHaveProperty('eventCounts')
    expect(data.metrics).toHaveProperty('lastUpdated')
  })
})
