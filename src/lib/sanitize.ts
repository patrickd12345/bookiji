/**
 * Safe HTML Rendering Utility
 * 
 * Sanitizes user-generated content to prevent XSS attacks.
 * Uses DOMPurify for client-side sanitization.
 */

/**
 * Sanitize HTML content for safe rendering
 * 
 * @param html - Raw HTML string (potentially unsafe)
 * @returns Sanitized HTML string safe for dangerouslySetInnerHTML
 */
export function sanitizeHTML(html: string): string {
  // Server-side: Strip HTML tags (DOMPurify requires DOM)
  if (typeof window === 'undefined') {
    // On server, strip all HTML tags as fallback
    // Content should ideally be sanitized before storage
    return html.replace(/<[^>]*>/g, '')
  }

  // Client-side: Use DOMPurify
  try {
    // Dynamic import to avoid SSR issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DOMPurify = require('dompurify')
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'span', 'div',
        'mark', 'del', 'ins', 'sub', 'sup'
      ],
      ALLOWED_ATTR: ['href', 'title', 'class', 'id'],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_TRUSTED_TYPE: false
    })
  } catch (_error) {
    // If DOMPurify fails, strip all HTML as fallback
    return html.replace(/<[^>]*>/g, '')
  }
}

/**
 * Sanitize and prepare content for dangerouslySetInnerHTML
 * 
 * @param content - Raw content (HTML string)
 * @returns Object with sanitized __html property
 */
export function safeHTML(content: string): { __html: string } {
  return { __html: sanitizeHTML(content) }
}

/**
 * Check if content appears to be HTML
 */
export function isHTML(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content)
}
