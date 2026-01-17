
import { describe, it, expect } from 'vitest'
import { safeHTML } from '../../src/lib/sanitize'

describe('sanitize vulnerability reproduction', () => {
  it('should not allow script injection via hex entities', () => {
    // <script> encoded as entities
    // &#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;
    // However, dangerouslySetInnerHTML will decode entities.
    // The regex sanitizer might miss it if it decodes after check or if browser decodes.

    // Actually, the journal says: "can be bypassed using HTML entity encoding (e.g. &#106; for j) to execute XSS."
    // Example: <a href="&#106;avascript:alert(1)">link</a>
    // The regex checks for `javascript:` but might miss `&#106;avascript:`

    const input = '<a href="&#106;avascript:alert(1)">link</a>'
    const result = safeHTML(input)

    // We expect the sanitizer to strip the dangerous href or the whole tag.
    // If it returns the input as is, it's vulnerable because the browser will decode &#106; to 'j' and execute javascript:

    expect(result.__html).not.toContain('&#106;avascript')
    expect(result.__html).not.toContain('javascript:')
  })

  it('should allow safe HTML', () => {
    const input = '<p>Hello <strong>World</strong></p>'
    const result = safeHTML(input)
    expect(result.__html).toBe(input)
  })
})
