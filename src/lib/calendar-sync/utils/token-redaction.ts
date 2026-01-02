/**
 * Token Redaction Utility
 * 
 * Recursively removes sensitive token fields from objects to prevent
 * accidental logging of access tokens, refresh tokens, etc.
 */

const TOKEN_FIELDS = ['access_token', 'refresh_token', 'token', 'authorization', 'auth_token']
const REDACTED_VALUE = '[REDACTED]'

/**
 * Recursively redact token fields from an object
 */
export function redactTokens(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactTokens(item))
  }

  const redacted: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    if (TOKEN_FIELDS.some((field) => lowerKey.includes(field))) {
      redacted[key] = REDACTED_VALUE
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactTokens(value)
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

/**
 * Safe logging function that automatically redacts tokens
 */
export function safeLog(message: string, data?: unknown): void {
  if (data !== undefined) {
    const redacted = redactTokens(data)
    console.log(message, redacted)
  } else {
    console.log(message)
  }
}

/**
 * Safe error logging that automatically redacts tokens
 */
export function safeError(message: string, error?: unknown): void {
  if (error !== undefined) {
    const redacted = redactTokens(error)
    console.error(message, redacted)
  } else {
    console.error(message)
  }
}
