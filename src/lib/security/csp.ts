export function buildCSPHeader(nonce: string): string {
  const self = "'self'"
  const unsafeInline = "'unsafe-inline'"
  return [
    `default-src ${self}`,
    `script-src ${self} 'nonce-${nonce}' https://js.stripe.com`,
    `style-src ${self} ${unsafeInline}`,
    `img-src ${self} data: https:`,
    `connect-src ${self} ws: wss: https://*.supabase.co https://api.sendgrid.com https://api.twilio.com https://js.stripe.com https://*.ingest.sentry.io`,
    `font-src ${self} data: https://fonts.gstatic.com`,
    `frame-src https://js.stripe.com https://hooks.stripe.com`,
    `frame-ancestors 'none'`,
    `base-uri ${self}`,
    `form-action ${self}`
  ].join('; ')
}


