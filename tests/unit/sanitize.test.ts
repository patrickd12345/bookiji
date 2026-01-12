import { describe, it, expect } from 'vitest'
import { safeHTML } from '@/lib/sanitize'

describe('safeHTML sanitizer', () => {
  it('preserves valid HTML', () => {
    const input = '<p>Hello <strong>world</strong></p>'
    const output = safeHTML(input)
    expect(output.__html).toBe(input)
  })

  it('allows safe attributes', () => {
    const input = '<a href="https://example.com" class="btn" target="_blank">Link</a>'
    const output = safeHTML(input)
    expect(output.__html).toBe(input)
  })

  it('strips script tags', () => {
    const input = '<script>alert(1)</script>'
    const output = safeHTML(input)
    expect(output.__html).toBe('')
  })

  it('strips inline event handlers', () => {
    const input = '<img src="x" onerror="alert(1)">'
    const output = safeHTML(input)
    expect(output.__html).not.toContain('onerror')
    expect(output.__html).toContain('<img')
  })

  it('strips javascript: URIs', () => {
    const input = '<a href="javascript:alert(1)">Click me</a>'
    const output = safeHTML(input)
    // The current implementation replaces javascript: with #
    // or strips the attribute. Ideally it should be stripped or safe.
    expect(output.__html).not.toContain('javascript:')
  })

  it('prevents bypass via HTML entities in attributes (CRITICAL)', () => {
    // This is the vulnerability mentioned in the journal
    // &#106; is 'j'
    const input = '<a href="&#106;avascript:alert(1)">Click me</a>'
    const output = safeHTML(input)
    expect(output.__html).not.toContain('&#106;avascript')
    expect(output.__html).not.toContain('javascript')
    // If it fails, it means it didn't strip/sanitize it because the regex didn't match 'javascript:'
  })

  it('strips style attributes', () => {
      const input = '<div style="color: red">Text</div>'
      const output = safeHTML(input)
      expect(output.__html).not.toContain('style')
  })

  it('removes disallowed tags but keeps content', () => {
      // 'blink' is not in the allowed list
      const input = '<blink>Don\'t blink</blink>'
      const output = safeHTML(input)
      expect(output.__html).not.toContain('<blink>')
      expect(output.__html).toContain("Don't blink")
  })
})
