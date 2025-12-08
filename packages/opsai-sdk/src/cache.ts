export type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class OpsAICache {
  private store = new Map<string, CacheEntry<unknown>>()

  constructor(private defaultTtlMs = 30_000) {}

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value as T
  }

  set<T>(key: string, value: T, ttlMs = this.defaultTtlMs): T {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  }

  getOrSet<T>(key: string, producer: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== undefined) return Promise.resolve(cached)
    return producer().then((value) => {
      this.set(key, value, ttlMs)
      return value
    })
  }

  pruneExpired() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key)
      }
    }
  }

  clear() {
    this.store.clear()
  }
}
