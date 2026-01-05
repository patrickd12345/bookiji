
import { describe, it, expect } from 'vitest'
import { safeHTML } from '../../src/lib/sanitize'

describe('safeHTML', () => {
  it('should allow allowed tags', () => {
    const input = '<p>Hello <strong>World</strong></p>'
    const output = safeHTML(input)
    expect(output.__html).toContain('<p>')
    expect(output.__html).toContain('<strong>')
    expect(output.__html).toContain('World')
  })

  it('should strip disallowed tags', () => {
    const input = '<div><script>alert(1)</script>Hello</div>'
    const output = safeHTML(input)
    expect(output.__html).not.toContain('<script>')
    expect(output.__html).toContain('Hello')
  })

  it('should remove inline event handlers', () => {
    const input = '<div onclick="alert(1)">Click me</div>'
    const output = safeHTML(input)
    expect(output.__html).not.toContain('onclick')
    expect(output.__html).toContain('Click me')
  })

  it('should remove javascript: urls', () => {
    const input = '<a href="javascript:alert(1)">Click me</a>'
    const output = safeHTML(input)
    expect(output.__html).not.toContain('javascript:')
  })

  it('should handle nested disallowed tags', () => {
    const input = '<div><scr<script>ipt>alert(1)</script></div>'
    const output = safeHTML(input)
    expect(output.__html).not.toContain('<script>')
  })

  it('should handle malformed attributes', () => {
    const input = '<img src=x onerror=alert(1)>'
    const output = safeHTML(input)
    expect(output.__html).not.toContain('onerror')
  })
})
