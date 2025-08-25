const buckets = new Map<string, { tokens: number; ts: number }>();
const WINDOW_MS = 60_000;

export function rateLimit(key: string, limitPerMin: number) {
  const now = Date.now();
  const bucket = buckets.get(key) || { tokens: limitPerMin, ts: now };
  const refill = Math.floor((now - bucket.ts) / WINDOW_MS);
  if (refill > 0) {
    bucket.tokens = Math.min(limitPerMin, bucket.tokens + refill * limitPerMin);
    bucket.ts = now;
  }
  if (bucket.tokens <= 0) return false;
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}
