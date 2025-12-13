import { describe, it, expect, vi } from 'vitest'
import { getSupabaseMock } from '../utils/supabase-mocks'

// Minimal cookie store mock for server client (set per test as well)
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => getSupabaseMock()) }))

describe('RLS/role protection: /api/blocks/list', () => {
  it('returns 401 when no user session', async () => {
    vi.resetModules()
    vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
    const supabase = getSupabaseMock()
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null } as any)
    vi.mock('@/config/supabase', () => ({ getSupabaseConfig: vi.fn(() => ({ url: 'u', publishableKey: 'k' })) }))
    const { GET } = await import('@/app/api/blocks/list/route')
    // Pass unauth header to trigger test override
    const res = await GET(new Request('https://example.com/api/blocks/list', { headers: { 'x-test-user': 'unauth' } }) as any)
    expect(res.status).toBe(401)
  })

  it('allows authenticated users and returns arrays', async () => {
    vi.resetModules()
    vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
    const supabase = getSupabaseMock()
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as any)
    supabase.from.mockImplementation(() => ({
      select: vi.fn(() => ({ eq: vi.fn(async () => ({ data: [], error: null })) }))
    }) as any)
    vi.mock('@/config/supabase', () => ({ getSupabaseConfig: vi.fn(() => ({ url: 'u', publishableKey: 'k' })) }))

    const { GET } = await import('@/app/api/blocks/list/route')
    const res = await GET(new Request('https://example.com/api/blocks/list'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(Array.isArray(json.blocks)).toBe(true)
    expect(Array.isArray(json.blocked_by)).toBe(true)
  })
})

