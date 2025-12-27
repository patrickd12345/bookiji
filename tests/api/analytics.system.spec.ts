import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/analytics/system/route'
import { GET as healthGET } from '@/app/api/health/route'
import { getSupabaseMock } from '../utils/supabase-mocks'

// Mock the Supabase config
vi.mock('@/config/supabase', () => ({
  getSupabaseConfig: () => ({
    url: 'https://test.supabase.co',
    publishableKey: 'test-publishable-key',
    secretKey: 'test-secret-key'
  })
}))

// Mock the createClient function from @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => getSupabaseMock())
}))

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key'
  process.env.SUPABASE_SECRET_KEY = 'test-secret-key'

  const supabase = getSupabaseMock()
  const analyticsEventsData = [{ properties: { country: 'US', device_type: 'desktop', user_id: 'user1' }, event_name: 'booking_error', created_at: '2024-01-16T10:00:00Z' }]

  supabase.from.mockImplementation((table: string) => {
    if (table === 'conversion_funnels') {
      return {
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(async () => ({
              data: [
                { event: 'page_view', created_at: '2024-01-16T10:00:00Z' },
                { event: 'booking_start', created_at: '2024-01-16T09:30:00Z' },
                { event: 'page_view', created_at: '2024-01-16T09:00:00Z' }
              ],
              error: null
            }))
          }))
        }))
      } as any
    }

    if (table === 'bookings') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(async () => ({
              data: [{ total_amount: 100, status: 'completed' }],
              error: null
            }))
          }))
        }))
      } as any
    }

    if (table === 'analytics_events') {
      return {
        select: vi.fn((_cols?: any, opts?: any) => {
          if (opts?.count) {
            return {
              gte: vi.fn(async () => ({ data: [], count: 10, error: null }))
            }
          }
          return {
            not: vi.fn(() => ({
              gte: vi.fn(async () => ({ data: analyticsEventsData, error: null }))
            })),
            gte: vi.fn(async () => ({ data: analyticsEventsData, error: null })),
            or: vi.fn(() => ({
              gte: vi.fn(async () => ({ data: analyticsEventsData, error: null }))
            }))
          }
        })
      } as any
    }

    return {} as any
  })
})

describe('GET /api/analytics/system', () => {
  it('returns aggregated system metrics', async () => {
    const req = new NextRequest('http://localhost:3000/api/analytics/system')
    const res = await GET(req)
    const data = await res.json()
    
    console.log('Analytics system response:', JSON.stringify(data, null, 2))

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(typeof data.data).toBe('object')
    expect(data.data).toHaveProperty('p95SessionDuration')
    expect(data.data).toHaveProperty('errorRate')
    expect(data.data).toHaveProperty('activeUsers')
  })

  it('health endpoint returns OK', async () => {
    const req = new NextRequest('http://localhost:3000/api/health')
    const res = await healthGET(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.status).toBe('healthy')
  })
})
