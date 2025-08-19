import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { limitRequest } from '@/middleware/requestLimiter'

// Force the limiter to use in-memory fallback by mocking Supabase config
vi.mock('@/config/supabase', () => ({
  getSupabaseConfig: vi.fn(() => ({ url: '', publishableKey: '', secretKey: undefined }))
}))

// Avoid attempting to import supabase client in this test
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }))

function makeRequest(ip: string, path = '/api/rl-rolloff') {
  return new Request(`http://localhost${path}`, {
    method: 'GET',
    headers: { 'x-forwarded-for': ip }
  })
}

describe('requestLimiter memory fallback window roll-off', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests again after the window resets', async () => {
    const windowMs = 1000
    const config = { windowMs, max: 2 }
    const req = makeRequest('9.9.9.9')

    // First two within window succeed (undefined means passed)
    const r1 = await limitRequest(req, config)
    const r2 = await limitRequest(req, config)
    expect(r1).toBeUndefined()
    expect(r2).toBeUndefined()

    // Third within same window is blocked
    const r3 = await limitRequest(req, config)
    expect(r3?.status).toBe(429)

    // Advance just beyond window deterministically
    await vi.advanceTimersByTimeAsync(windowMs + 50)

    // Next request should be allowed again after roll-off/reset
    const r4 = await limitRequest(req, config)
    expect(r4).toBeUndefined()
  })
})


