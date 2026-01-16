import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content and returns it in the format expected by dangerouslySetInnerHTML.
 *
 * Uses isomorphic-dompurify to ensure safe HTML both on server and client.
 * This protects against XSS including obfuscated vectors (e.g. &#106;avascript) that regex misses.
 */
export function safeHTML(html: string): { __html: string } {
  if (!html) return { __html: '' };

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'img',
      'div', 'span',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'mark',
      // Added based on usage in regex sanitizer, but typically good to have
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 'class', 'id', 'target', 'rel',
      'colspan', 'rowspan',
    ],
    // Ensure links open in new tab if they are external (optional, but good UX/Security)
    ADD_ATTR: ['target'],
  });

  return { __html: clean };
}
