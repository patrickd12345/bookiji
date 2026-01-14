import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitizes HTML content and returns it in the format expected by dangerouslySetInnerHTML.
 *
 * Uses isomorphic-dompurify for robust XSS protection.
 */
export function safeHTML(html: string): { __html: string } {
  // DOMPurify sanitizes the input, stripping out dangerous tags and attributes
  // including encoded XSS vectors.
  const clean = DOMPurify.sanitize(html)
  return { __html: clean }
}
