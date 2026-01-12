import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content and returns it in the format expected by dangerouslySetInnerHTML.
 *
 * Uses isomorphic-dompurify to prevent XSS attacks while allowing safe HTML.
 * This replaces the previous regex-based implementation which was vulnerable to bypasses.
 */
export function safeHTML(html: string): { __html: string } {
  return { __html: sanitize(html) }
}

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
    // Ensure links open in new tab if they are external (optional but good practice,
    // though the previous implementation didn't strictly enforce this, it allowed target attr)
    // ADD_ATTR: ['target'], // target is in ALLOWED_ATTR
  })
}
