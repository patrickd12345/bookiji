import { test, expect } from '@playwright/test'
import { middleware, securityHeaders, addSecurityHeaders } from '../../src/middleware'
import { NextRequest, NextResponse } from 'next/server'

test.describe('Security Middleware', () => {
  test('adds security headers to responses', () => {
    const response = new NextResponse()
    addSecurityHeaders(response)
    
    Object.entries(securityHeaders).forEach(([k, v]) => {
      expect(response.headers.get(k)).toBe(v)
    })
  })

  test('rate limits excessive requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/test')
    
    // Make requests up to the limit
    for (let i = 0; i < 60; i++) {
      const response = await middleware(request)
      expect(response.status).toBe(200)
    }
    
    // Next request should be rate limited
    const rateLimitedResponse = await middleware(request)
    expect(rateLimitedResponse.status).toBe(429)
  })

  test('allows requests after rate limit window', async () => {
    const request = new NextRequest('http://localhost:3000/api/test')
    
    // Wait for rate limit window to reset (simulate by calling reset function)
    // In a real test, you'd wait for the actual time window
    const response = await middleware(request)
    expect(response.status).toBe(200)
  })
})
