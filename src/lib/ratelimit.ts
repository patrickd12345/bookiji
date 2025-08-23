interface RateLimitBucket {
  tokens: number
  ts: number
}

const buckets = new Map<string, RateLimitBucket>()

export function rateLimit(
  key: string, 
  limit: number = 60, 
  refillPerSec: number = 1
): boolean {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { tokens: limit, ts: now }
  
  // Calculate token refill
  const refill = ((now - bucket.ts) / 1000) * refillPerSec
  bucket.tokens = Math.min(limit, bucket.tokens + refill)
  bucket.ts = now
  
  // Check if we have tokens
  if (bucket.tokens < 1) {
    return false
  }
  
  // Consume token
  bucket.tokens -= 1
  buckets.set(key, bucket)
  return true
}

export function getRateLimitInfo(key: string): { tokens: number; limit: number } | null {
  const bucket = buckets.get(key)
  if (!bucket) return null
  
  return {
    tokens: Math.max(0, bucket.tokens),
    limit: 60 // Default limit
  }
}

// Clean up old buckets periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000
  
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.ts > fiveMinutes) {
      buckets.delete(key)
    }
  }
}, 5 * 60 * 1000)
