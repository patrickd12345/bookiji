import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitizes HTML content and returns it in the format expected by dangerouslySetInnerHTML.
 *
 * Uses isomorphic-dompurify which works in both Node.js (server-side) and browser.
 */
export function safeHTML(html: string): { __html: string } {
  return { __html: sanitize(html) }
}

// Configured to match the previous whitelist as closely as possible,
// but relying on DOMPurify's robust parsing.
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'div', 'span',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'mark',
]

const ALLOWED_ATTR = [
  'href', 'title', 'alt', 'src', 'class', 'id', 'target', 'rel',
  'colspan', 'rowspan',
]

function sanitize(input: string): string {
  if (!input) return ''

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}
