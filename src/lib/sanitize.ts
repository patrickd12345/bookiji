/**
 * Sanitizes HTML content and returns it in the format expected by dangerouslySetInnerHTML.
 *
 * IMPORTANT: This implementation is dependency-free so it works during Next.js server rendering.
 * (Bundling jsdom-based sanitizers has caused server 500s in local/E2E.)
 */
export function safeHTML(html: string): { __html: string } {
  return { __html: sanitize(html) }
}

const DISALLOWED_BLOCK_TAGS = ['script', 'style', 'iframe', 'object', 'embed'] as const
const DISALLOWED_VOID_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'] as const

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 's',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'div', 'span',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'mark',
])

const ALLOWED_ATTRS = new Set([
  'href', 'title', 'alt', 'src', 'class', 'id', 'target', 'rel',
  'colspan', 'rowspan',
])

function sanitize(input: string): string {
  if (!input) return ''

  let out = input

  // Drop whole blocks first (script/style/etc)
  for (const tag of DISALLOWED_BLOCK_TAGS) {
    const block = new RegExp(`<\\s*${tag}[^>]*>[\\s\\S]*?<\\s*\\/\\s*${tag}\\s*>`, 'gi')
    out = out.replace(block, '')
  }

  // Drop void disallowed tags
  for (const tag of DISALLOWED_VOID_TAGS) {
    const voidTag = new RegExp(`<\\s*${tag}[^>]*\\/?>`, 'gi')
    out = out.replace(voidTag, '')
  }

  // Remove inline event handlers and style attributes
  out = out.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  out = out.replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')

  // Remove dangerous javascript: URLs
  out = out.replace(/\s(href|src)\s*=\s*(\"|')\s*javascript:[^\"']*\2/gi, ' $1="#"')

  // Drop any tag not in the allowlist (keep text content)
  out = out.replace(/<\/?([a-z0-9-]+)(\s[^>]*)?>/gi, (match, tagName) => {
    const tag = String(tagName).toLowerCase()
    return ALLOWED_TAGS.has(tag) ? match : ''
  })

  // Strip attributes from allowed tags except the allowlist
  out = out.replace(/<([a-z0-9-]+)(\s[^>]*?)?>/gi, (match, tagName, attrs) => {
    const tag = String(tagName).toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ''
    if (!attrs) return `<${tag}>`

    const kept: string[] = []
    const attrRegex = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
    let m: RegExpExecArray | null
    while ((m = attrRegex.exec(attrs))) {
      const name = m[1]?.toLowerCase()
      if (!name || !ALLOWED_ATTRS.has(name)) continue

      const rawValue = m[2] ?? m[3] ?? m[4] ?? ''
      let value = String(rawValue)

      if ((name === 'href' || name === 'src') && /^javascript:/i.test(value.trim())) {
        value = '#'
      }

      // Always quote attribute values
      const escapedValue = value.replace(/"/g, '&quot;')
      kept.push(`${name}="${escapedValue}"`)
    }

    return kept.length ? `<${tag} ${kept.join(' ')}>` : `<${tag}>`
  })

  return out
}




















