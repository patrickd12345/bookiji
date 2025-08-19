import { describe, it, expect } from 'vitest'
import { addSecurityHeaders } from '@/middleware'
import { NextResponse } from 'next/server'

describe('Security headers', () => {
  it('adds standard security headers', () => {
    const res = new NextResponse()
    addSecurityHeaders(res)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(res.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()')
  })
})


