/**
 * Rate limiter for service requests and API endpoints
 * Prevents spam and abuse
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (in production, use Redis for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check if a request should be rate limited
 * @param key Unique identifier for the rate limit (e.g., user ID, IP address)
 * @param config Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up on each request
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k)
      }
    }
  }

  if (!entry || entry.resetAt < now) {
    // New window or expired - allow request
    const resetAt = now + config.windowMs
    rateLimitStore.set(key, {
      count: 1,
      resetAt,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    }
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Service request spam control configuration
 */
export const SERVICE_REQUEST_LIMITS: RateLimitConfig = {
  maxRequests: 5, // 5 requests per window
  windowMs: 60 * 60 * 1000, // 1 hour
}

/**
 * Check if a service request should be allowed (spam control)
 * @param userId User ID making the request
 * @param requestData Request data for deduplication
 * @returns Rate limit result
 */
export function checkServiceRequestLimit(
  userId: string,
  requestData?: { serviceDetails?: string; desiredDateTime?: string }
): RateLimitResult {
  // Create a key that includes user ID and request fingerprint for deduplication
  const fingerprint = requestData
    ? `${requestData.serviceDetails || ''}_${requestData.desiredDateTime || ''}`
    : ''
  const key = `service_request:${userId}:${fingerprint}`

  return checkRateLimit(key, SERVICE_REQUEST_LIMITS)
}
