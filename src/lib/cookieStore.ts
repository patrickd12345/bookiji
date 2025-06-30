import { cookies } from 'next/headers'

export function getCookieStore() {
  return cookies()
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
} as const 