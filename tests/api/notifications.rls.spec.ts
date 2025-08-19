import { describe, it, expect, vi } from 'vitest'
// Mock modules BEFORE importing handlers
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
vi.mock('@/config/supabase', () => ({ getSupabaseConfig: vi.fn(() => ({ url: 'u', publishableKey: 'k' })) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => ({ auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) }, from: vi.fn() })) }))

import { GET, DELETE } from '@/app/api/notifications/route'

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
vi.mock('@/config/supabase', () => ({ getSupabaseConfig: vi.fn(() => ({ url: 'u', publishableKey: 'k' })) }))

describe('RLS/role protection: /api/notifications', () => {
  it('GET: 401 without session', async () => {
    vi.resetModules()
    vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
    vi.mock('@/config/supabase', () => ({ getSupabaseConfig: vi.fn(() => ({ url: 'u', publishableKey: 'k' })) }))
    vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => ({ auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) }, from: vi.fn() })) }))
    const { GET } = await import('@/app/api/notifications/route')
    const res = await GET(new Request('https://example.com/api/notifications', { headers: { 'x-test-user': 'unauth' } }) as any)
    expect(res.status).toBe(401)
  })

  it('GET: 200 with notifications array when authenticated', async () => {
    vi.resetModules()
    vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
    vi.mock('@/config/supabase', () => ({ getSupabaseConfig: vi.fn(() => ({ url: 'u', publishableKey: 'k' })) }))
    vi.mock('@supabase/ssr', () => ({
      createServerClient: vi.fn(() => ({
        auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })) },
        from: vi.fn((table: string) => {
          if (table === 'notifications') {
            return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(async () => ({ data: [], error: null })) })) })) }
          }
          return {}
        })
      }))
    }))
    const { GET } = await import('@/app/api/notifications/route')
    const res = await GET(new Request('https://example.com/api/notifications', { headers: { 'x-test-user': 'auth' } }) as any)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(Array.isArray(json.notifications)).toBe(true)
  })

  it('DELETE: 401 without session', async () => {
    vi.resetModules()
    vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
    vi.mock('@/config/supabase', () => ({ getSupabaseConfig: vi.fn(() => ({ url: 'u', publishableKey: 'k' })) }))
    vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => ({ auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) }, from: vi.fn() })) }))
    const { DELETE } = await import('@/app/api/notifications/route')
    const res = await DELETE(new Request('https://example.com/api/notifications?id=n1', { method: 'DELETE', headers: { 'x-test-user': 'unauth' } }) as any)
    expect(res.status).toBe(401)
  })

  it('DELETE: 400 when id missing', async () => {
    vi.resetModules()
    vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
    vi.mock('@/config/supabase', () => ({ getSupabaseConfig: vi.fn(() => ({ url: 'u', publishableKey: 'k' })) }))
    vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => ({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })) }, from: vi.fn() })) }))
    const { DELETE } = await import('@/app/api/notifications/route')
    const res = await DELETE(new Request('https://example.com/api/notifications', { method: 'DELETE', headers: { 'x-test-user': 'auth' } }) as any)
    expect(res.status).toBe(400)
  })

  it('DELETE: 200 when authenticated and delete succeeds', async () => {
    vi.resetModules()
    vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
    vi.mock('@/config/supabase', () => ({ getSupabaseConfig: vi.fn(() => ({ url: 'u', publishableKey: 'k' })) }))
    vi.mock('@supabase/ssr', () => ({
      createServerClient: vi.fn(() => ({
        auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })) },
        from: vi.fn((table: string) => {
          if (table === 'notifications') {
            return { delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) })) }
          }
          return {}
        })
      }))
    }))
    const { DELETE } = await import('@/app/api/notifications/route')
    const res = await DELETE(new Request('https://example.com/api/notifications?id=n1', { method: 'DELETE', headers: { 'x-test-user': 'auth' } }) as any)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })
})


