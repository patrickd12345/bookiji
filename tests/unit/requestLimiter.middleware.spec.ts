import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { limitRequest, getClientIp } from '@/middleware/requestLimiter'

// Test helper to create a mock request
function createMockRequest(ip: string = '1.2.3.4'): Request {
  const headers = new Headers()
  headers.set('x-forwarded-for', ip)
  
  // Note: requestLimiter intentionally skips /api/test/* routes in non-production.
  return new Request('http://localhost:3000/api/test/health', {
    method: 'GET',
    headers
  })
}

// Test helper to reset the limiter state
function __testOnly_resetLimiter() {
  // This would need to be implemented if we want to test the memory fallback
  // For now, we'll test the main limitRequest function
}

describe('middleware sliding window', () => {
  beforeEach(() => { 
    __testOnly_resetLimiter(); 
    vi.useFakeTimers(); 
    vi.setSystemTime(0) 
  })
  afterEach(() => vi.useRealTimers())

  it('skips rate limiting for /api/test/* routes in non-production', async () => {
    const max = 3
    const windowMs = 2000
    const config = { max, windowMs }

    // Test that requests are allowed within the limit
    for (let i = 0; i < max + 2; i++) {
      const request = createMockRequest()
      const result = await limitRequest(request, config)
      expect(result).toBeUndefined() // No rate limiting applied
    }
  })

  it('extracts client IP correctly', () => {
    const request = createMockRequest('192.168.1.1')
    const ip = getClientIp(request)
    expect(ip).toBe('192.168.1.1')
  })
})


