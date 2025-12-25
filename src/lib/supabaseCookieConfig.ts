/**
 * Supabase Cookie Configuration for Cross-Subdomain Support
 * 
 * Note: Supabase SSR handles cookies internally via setAll().
 * To enable cross-subdomain cookies, Supabase must be configured with:
 * - Site URL: https://bookiji.com (or wildcard)
 * - Redirect URLs: Include both https://bookiji.com/** and https://sched.bookiji.com/**
 * 
 * The domain option is set automatically by Supabase based on the request hostname.
 * For cross-subdomain support, cookies need domain: '.bookiji.com' which Supabase
 * should handle automatically when configured correctly.
 */

import type { CookieOptions } from '@supabase/ssr'

/**
 * Get cookie options for Supabase with subdomain support
 * This is used when manually setting Supabase cookies
 */
export function getSupabaseCookieOptions(overrides: Partial<CookieOptions> = {}): CookieOptions {
  return {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    // In production, set domain to allow cookies across subdomains
    ...(process.env.NODE_ENV === 'production' && { domain: '.bookiji.com' }),
    ...overrides
  }
}

