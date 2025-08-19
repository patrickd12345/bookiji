import { describe, it, expect } from 'vitest'
import { buildCSPHeader } from '@/lib/security/csp'

describe('CSP builder', () => {
  it('builds a header containing the provided nonce', () => {
    const nonce = 'abc123'
    const csp = buildCSPHeader(nonce)
    expect(csp).toContain(`'nonce-${nonce}`)
    expect(csp).toContain("default-src 'self'")
  })
})


