export function buildCSPHeader(nonce: string): string {
  const self = "'self'"
  const unsafeInline = "'unsafe-inline'"
  const ADS = [
    'https://pagead2.googlesyndication.com',
    'https://googleads.g.doubleclick.net',
    'https://tpc.googlesyndication.com',
    'https://adservice.google.com',
    'https://adservice.google.ca',
  ]
  const GOOGLE_MISC = [
    'https://www.googletagservices.com',
    'https://www.gstatic.com',
    'https://www.google.com',
  ]
  return [
    `default-src ${self}`,
    `script-src ${self} 'nonce-${nonce}' https://js.stripe.com ${ADS[0]} ${GOOGLE_MISC.join(' ')}`,
    `style-src ${self} ${unsafeInline}`,
    `img-src ${self} data: blob: https: ${ADS.join(' ')}`,
    `connect-src ${self} ws: wss: https://*.supabase.co https://api.sendgrid.com https://api.twilio.com https://js.stripe.com https://*.ingest.sentry.io https://hooks.stripe.com ${ADS.join(' ')}`,
    `font-src ${self} data: https://fonts.gstatic.com`,
    `frame-src https://js.stripe.com https://hooks.stripe.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com`,
    `frame-ancestors 'none'`,
    `base-uri ${self}`,
    `form-action ${self}`
  ].join('; ')
}


