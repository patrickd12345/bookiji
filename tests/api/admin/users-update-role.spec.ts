import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/admin/users/update-role/route'
import { NextRequest, NextResponse } from 'next/server'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  update: vi.fn().mockReturnThis()
}

// Mock createServerClient
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => mockSupabase
}))

// Mock getSupabaseConfig
vi.mock('@/config/supabase', () => ({
  getSupabaseConfig: () => ({
    url: 'https://test.supabase.co',
    publishableKey: 'test-key'
  })
}))

describe('POST /api/admin/users/update-role', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = '' // Ensure no env var leakage

    // Reset default mock implementations
    mockSupabase.from.mockReturnThis()
    mockSupabase.select.mockReturnThis()
    mockSupabase.eq.mockReturnThis() // Default behavior for chaining
    mockSupabase.update.mockReturnThis()
  })

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'Auth error' })

    const request = new NextRequest('http://localhost:3000/api/admin/users/update-role', {
      method: 'POST',
      body: JSON.stringify({ userId: 'target-user', role: 'admin' })
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should return 403 if user is not an admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    // Mock profile query returning non-admin role
    // For the profile check: .from().select().eq().single()
    mockSupabase.single.mockResolvedValue({
      data: { role: 'customer' },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/admin/users/update-role', {
      method: 'POST',
      body: JSON.stringify({ userId: 'target-user', role: 'admin' })
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('should return 200 if user is an admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@example.com' } },
      error: null
    })

    // Mock profile query returning admin role
    mockSupabase.single.mockResolvedValue({
      data: { role: 'admin' },
      error: null
    })

    // For the update: .from().update().eq()
    // We need eq() to return a promise resolving to { error: null } specifically when called after update()
    // But eq() is also used in the profile check.

    // Strategy: Mock `eq` to return a thennable (Promise-like) that also has `single`?
    // Or, since the code is:
    // 1. .from('profiles').select('role').eq('id', user.id).single()
    // 2. .from('profiles').update({ role }).eq('id', userId)

    // We can make `eq` behave differently based on previous calls, but that's hard with just mockReturnThis.
    // Instead, we can make `eq` return an object that is both a Promise (resolving to update result) AND has `single` (returning profile result).

    const updateResult = { error: null }
    const profileResult = { data: { role: 'admin' }, error: null }

    const chainable = {
        single: vi.fn().mockResolvedValue(profileResult),
        then: (resolve) => resolve(updateResult)
    }

    mockSupabase.eq.mockReturnValue(chainable)
    // We also need `select` to return something that has `eq` that returns `chainable`
    mockSupabase.select.mockReturnThis()
    mockSupabase.update.mockReturnThis()
    // And `from` returns `this`
    mockSupabase.from.mockReturnThis()

    const request = new NextRequest('http://localhost:3000/api/admin/users/update-role', {
      method: 'POST',
      body: JSON.stringify({ userId: 'target-user', role: 'admin' })
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it('should not allow access with previously hardcoded emails if not in env var', async () => {
     mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'hacker-1', email: 'admin@bookiji.com' } }, // One of the removed emails
      error: null
    })

    // Mock profile query returning non-admin role
    mockSupabase.single.mockResolvedValue({
      data: { role: 'customer' },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/admin/users/update-role', {
      method: 'POST',
      body: JSON.stringify({ userId: 'target-user', role: 'admin' })
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
  })
})
