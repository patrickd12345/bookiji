import { createHmac, timingSafeEqual, randomUUID } from 'crypto'
import { sign as jwtSign, verify as jwtVerify } from 'jsonwebtoken'

const secret = process.env.RESCHEDULE_JWT_SECRET || 'fallback-secret-change-in-production'

export function signRescheduleToken(payload: object, ttlSec = 1800): { token: string; jti: string; exp: number } {
  const jti = randomUUID()
  const exp = Math.floor(Date.now() / 1000) + ttlSec
  
  const token = jwtSign(
    { ...payload, jti, exp },
    secret,
    { algorithm: 'HS256' }
  )
  
  return { token, jti, exp }
}

export function verifyRescheduleToken<T = any>(token: string): T {
  try {
    const decoded = jwtVerify(token, secret, { algorithms: ['HS256'] }) as T
    return decoded
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Legacy function for backward compatibility
export function signJWT(payload: object, ttlSec = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec
  return jwtSign(
    { ...payload, exp },
    secret,
    { algorithm: 'HS256' }
  )
}

export function verifyJWT<T = any>(token: string): T {
  try {
    const decoded = jwtVerify(token, secret, { algorithms: ['HS256'] }) as T
    return decoded
  } catch (error) {
    throw new Error('Invalid token')
  }
}



