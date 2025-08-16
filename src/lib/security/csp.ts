export function buildCSPHeader(nonce: string): string {
  const self = "'self'"
  const none = "'none'"
  const unsafeInline = "'unsafe-inline'" // allow only with nonce where supported
  return [
    `default-src ${self}`,
    `script-src ${self} 'nonce-${nonce}'`,
    `style-src ${self} ${unsafeInline}`,
    `img-src ${self} data:`,
    `connect-src ${self}`,
    `font-src ${self} data:`,
    `frame-ancestors 'none'`,
    `base-uri ${self}`,
    `form-action ${self}`
  ].join('; ')
}


