import { describe, expect, it, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabaseServerClient', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/config/supabase', () => ({
  getSupabaseConfig: () => ({ url: 'http://example.supabase', publishableKey: 'anon' }),
}))

import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { POST } from '@/app/api/simcity/purge/route'

function buildRequest(body: any, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/simcity/purge', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  })
}

describe('SimCity purge endpoint', () => {
  const counts: Record<string, number> = {
    bookings: 3,
    profiles: 1,
    sessions: 0,
    analytics_events: 2,
    events: 0,
  }

  const supabaseMock: any = {
    from: vi.fn((table: string) => ({
      select: vi.fn((_cols: string, _options: any) => ({
        eq: vi.fn(async () => ({ count: counts[table] ?? 0, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(async () => {
          counts[table] = 0
          return { error: null }
        }),
      })),
    })),
  }

  beforeEach(() => {
    Object.assign(counts, { bookings: 3, profiles: 1, sessions: 0, analytics_events: 2, events: 0 })
    vi.mocked(createSupabaseServerClient).mockReturnValue(supabaseMock)
    vi.mocked(cookies).mockReturnValue({ get: vi.fn() } as any)
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'admin' } }, error: null })) },
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(async () => ({ data: { role: 'admin' } })) })) })),
    } as any)
    process.env.BOOKIJI_ENV = 'dev'
    process.env.INTERNAL_API_TOKEN = 'secret'
  })

  it('returns counts for dry run without deleting data', async () => {
    const response = await POST(buildRequest({ dryRun: true }, { 'x-internal-token': 'secret' }))
    const payload = await response.json()

    expect(payload.dryRun).toBe(true)
    expect(payload.total).toBe(6)
    expect(counts.bookings).toBe(3)
    expect(vi.mocked(supabaseMock.from).mock.calls.length).toBeGreaterThan(0)
  })

  it('purges synthetic records and is idempotent', async () => {
    const first = await POST(buildRequest({}, { 'x-internal-token': 'secret' }))
    const firstPayload = await first.json()

    expect(firstPayload.total).toBe(6)
    expect(counts.bookings).toBe(0)

    const second = await POST(buildRequest({}, { 'x-internal-token': 'secret' }))
    const secondPayload = await second.json()

    expect(secondPayload.total).toBe(0)
  })
})
