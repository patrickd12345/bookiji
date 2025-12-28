import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content and returns it in the format expected by dangerouslySetInnerHTML
 * @param html - The HTML string to sanitize
 * @returns An object with __html property containing sanitized HTML
 */
export function safeHTML(html: string): { __html: string } {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'div', 'span',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'mark'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 'class', 'id', 'target', 'rel'
    ],
    ALLOW_DATA_ATTR: false,
  });
  
  return { __html: sanitized };
}





