import { cookies } from 'next/headers'
import { getCookieOptions } from './cookieHelpers'

export function getCookieStore() {
  return cookies()
}

/**
 * Default cookie options with subdomain support
 * Use getCookieOptions() from cookieHelpers for more control
 */
export const cookieOptions = getCookieOptions({
  httpOnly: true
}) as const 