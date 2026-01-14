import { describe, it, expect } from 'vitest'
import { safeHTML } from '../../src/lib/sanitize'

describe('safeHTML', () => {
  it('should sanitize basic XSS vectors', () => {
    const malicious = '<script>alert(1)</script>'
    const result = safeHTML(malicious)
    expect(result.__html).not.toContain('<script>')
  })

  it('should sanitize javascript: protocol', () => {
    const malicious = '<a href="javascript:alert(1)">Click me</a>'
    const result = safeHTML(malicious)
    expect(result.__html).not.toContain('javascript:')
    // DOMPurify removes the dangerous attribute entirely
    expect(result.__html).not.toContain('href')
  })

  it('should sanitize onerror attributes', () => {
    const malicious = '<img src=x onerror=alert(1)>'
    const result = safeHTML(malicious)
    expect(result.__html).not.toContain('onerror')
  })

  // The specific vulnerability mentioned in the journal
  it('should sanitize encoded javascript protocol', () => {
    // &#106; is 'j'
    const malicious = '<a href="&#106;avascript:alert(1)">Click me</a>'
    const result = safeHTML(malicious)

    // DOMPurify should detect this as dangerous and remove the attribute
    expect(result.__html).not.toContain('javascript:')
    expect(result.__html).not.toContain('&#106;avascript')
  })

  it('should preserve safe HTML', () => {
    const safe = '<p>Hello <strong>World</strong></p>'
    const result = safeHTML(safe)
    expect(result.__html).toContain('<p>')
    expect(result.__html).toContain('<strong>')
    expect(result.__html).toContain('Hello')
  })
})
