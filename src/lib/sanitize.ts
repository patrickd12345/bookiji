import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitizes HTML content and returns it in the format expected by dangerouslySetInnerHTML.
 *
 * Uses isomorphic-dompurify to provide robust XSS protection while supporting SSR.
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

export function sanitize(input: string): string {
  if (!input) return ''

  // Configure DOMPurify
  const config = {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Ensure links open in new tab if they are external (optional, but good practice if not already handled)
    // But we strictly follow existing behavior which didn't force target="_blank".
    // We do need to allow data URIs? The regex version checked for javascript:

    // Prevent usage of dangerous protocols
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  }

  return DOMPurify.sanitize(input, config) as string
}
