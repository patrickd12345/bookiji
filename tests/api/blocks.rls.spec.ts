import { describe, it, expect, vi } from 'vitest'

// Minimal cookie store mock for server client (set per test as well)
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))

describe('RLS/role protection: /api/blocks/list', () => {
  it('returns 401 when no user session', async () => {
    vi.resetModules()
    vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
    vi.mock('@supabase/ssr', () => ({
      createServerClient: vi.fn(() => ({ auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) } }))
    }))
    vi.mock('@/config/supabase', () => ({ getSupabaseConfig: vi.fn(() => ({ url: 'u', publishableKey: 'k' })) }))
    const { GET } = await import('@/app/api/blocks/list/route')
    // Pass unauth header to trigger test override
    const res = await GET(new Request('https://example.com/api/blocks/list', { headers: { 'x-test-user': 'unauth' } }) as any)
    expect(res.status).toBe(401)
  })

  it('allows authenticated users and returns arrays', async () => {
    vi.resetModules()
    vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
    vi.mock('@supabase/ssr', () => ({
      createServerClient: vi.fn(() => ({
        auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })) },
        from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(async () => ({ data: [], error: null })) })) }))
      }))
    }))
    vi.mock('@/config/supabase', () => ({ getSupabaseConfig: vi.fn(() => ({ url: 'u', publishableKey: 'k' })) }))

    const { GET } = await import('@/app/api/blocks/list/route')
    const res = await GET(new Request('https://example.com/api/blocks/list'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(Array.isArray(json.blocks)).toBe(true)
    expect(Array.isArray(json.blocked_by)).toBe(true)
  })
})


