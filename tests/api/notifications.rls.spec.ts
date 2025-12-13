import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseMock } from '../utils/supabase-mocks'
// Mock modules BEFORE importing handlers
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
vi.mock('@/config/supabase', () => ({ getSupabaseConfig: vi.fn(() => ({ url: 'u', publishableKey: 'k' })) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => getSupabaseMock()) }))

import { GET, DELETE } from '@/app/api/notifications/route'

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }))
vi.mock('@/config/supabase', () => ({ getSupabaseConfig: vi.fn(() => ({ url: 'u', publishableKey: 'k' })) }))

const configureSupabase = () => {
  const supabase = getSupabaseMock()
  supabase.from.mockImplementation((table: string) => {
    if (table === 'notifications') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => ({ data: [], error: null }))
          }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null }))
          }))
        }))
      } as any
    }
    return {} as any
  })
  return supabase
}

beforeEach(() => {
  configureSupabase()
})

describe('RLS/role protection: /api/notifications', () => {
  it('GET: 401 without session', async () => {
    const supabase = configureSupabase()
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null } as any)
    const res = await GET(new Request('https://example.com/api/notifications', { headers: { 'x-test-user': 'unauth' } }) as any)
    expect(res.status).toBe(401)
  })

  it('GET: 200 with notifications array when authenticated', async () => {
    const supabase = configureSupabase()
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as any)
    const res = await GET(new Request('https://example.com/api/notifications', { headers: { 'x-test-user': 'auth' } }) as any)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(Array.isArray(json.notifications)).toBe(true)
  })

  it('DELETE: 401 without session', async () => {
    const supabase = configureSupabase()
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null } as any)
    const res = await DELETE(new Request('https://example.com/api/notifications?id=n1', { method: 'DELETE', headers: { 'x-test-user': 'unauth' } }) as any)
    expect(res.status).toBe(401)
  })

  it('DELETE: 400 when id missing', async () => {
    const supabase = configureSupabase()
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as any)
    const res = await DELETE(new Request('https://example.com/api/notifications', { method: 'DELETE', headers: { 'x-test-user': 'auth' } }) as any)
    expect(res.status).toBe(400)
  })

  it('DELETE: 200 when authenticated and delete succeeds', async () => {
    const supabase = configureSupabase()
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as any)
    const res = await DELETE(new Request('https://example.com/api/notifications?id=n1', { method: 'DELETE', headers: { 'x-test-user': 'auth' } }) as any)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })
})
