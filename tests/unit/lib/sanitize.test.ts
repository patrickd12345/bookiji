import { describe, it, expect } from 'vitest'
import { safeHTML } from '../../../src/lib/sanitize'

describe('sanitize', () => {
  it('should prevent XSS via HTML entities', () => {
    // 'javascript' encoded as HTML entities
    // &#106; is 'j'
    const malicious = '<a href="&#106;avascript:alert(1)">Click me</a>'
    const result = safeHTML(malicious)
    // The sanitizer should strip the unsafe href or the whole tag
    // If it returns the original string (decoded by browser to javascript:...), it's vulnerable.
    // However, our regex might not even decode it, passing it through.
    // The browser will decode &#106; to j and execute it.

    // We expect the sanitizer to be smart enough to either decode and check, or reject entities in attributes.
    // Ideally, it should produce something safe.

    expect(result.__html).not.toMatch(/&#106;avascript/i)
    expect(result.__html).not.toMatch(/javascript:/i)
  })

  it('should allow safe HTML', () => {
    const safe = '<p>Hello <strong>World</strong></p>'
    const result = safeHTML(safe)
    expect(result.__html).toBe(safe)
  })
})
