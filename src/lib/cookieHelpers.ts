/**
 * Cookie helper functions for consistent cookie domain configuration
 * Ensures cookies work across subdomains when needed
 */

export interface CookieOptions {
  path?: string
  maxAge?: number
  httpOnly?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  secure?: boolean
  domain?: string
}

/**
 * Get cookie options with subdomain support
 * In production, sets domain to '.bookiji.com' for cross-subdomain cookies
 */
export function getCookieOptions(overrides: CookieOptions = {}): CookieOptions {
  const baseOptions: CookieOptions = {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    ...overrides
  }

  // In production, set domain to allow cookies across subdomains
  if (process.env.NODE_ENV === 'production' && !overrides.domain) {
    baseOptions.domain = '.bookiji.com'
  }

  return baseOptions
}

/**
 * Merge cookie options with defaults
 */
export function mergeCookieOptions(custom: CookieOptions): CookieOptions {
  return getCookieOptions(custom)
}

