import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock environment variables
const MOCK_CRON_SECRET = 'test-cron-secret'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    upsert: vi.fn(() => Promise.resolve({ error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}

// Mock the proxy module
vi.mock('@/lib/supabaseProxies', () => ({
  supabaseAdmin: mockSupabase
}))

describe('POST /api/setup-test-data Security', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', MOCK_CRON_SECRET)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should return 401 if Authorization header is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/setup-test-data', {
      method: 'POST',
    })

    const { POST } = await import('@/app/api/setup-test-data/route')
    const response = await POST(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 if Authorization header is incorrect', async () => {
    const request = new NextRequest('http://localhost:3000/api/setup-test-data', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer wrong-secret'
      }
    })

    const { POST } = await import('@/app/api/setup-test-data/route')
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should return 401 if CRON_SECRET is not set in env', async () => {
    vi.stubEnv('CRON_SECRET', '') // Simulate missing secret

    const request = new NextRequest('http://localhost:3000/api/setup-test-data', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' // Empty bearer matching empty secret? Code handles this.
      }
    })

    const { POST } = await import('@/app/api/setup-test-data/route')
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should succeed if Authorization header is correct', async () => {
    const request = new NextRequest('http://localhost:3000/api/setup-test-data', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOCK_CRON_SECRET}`
      }
    })

    const { POST } = await import('@/app/api/setup-test-data/route')
    const response = await POST(request)

    expect(response.status).toBe(200)
    // Check if supabase mock was used (implies we passed auth check)
    // Since the actual implementation does a lot of stuff, we can just check 200 for now.
    // Ideally we verify calls to mockSupabase.from('users').upsert(...)
    // but the implementation details are complex.
  })
})
