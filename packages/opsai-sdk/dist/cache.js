export class OpsAICache {
    constructor(defaultTtlMs = 30000) {
        this.defaultTtlMs = defaultTtlMs;
        this.store = new Map();
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value, ttlMs = this.defaultTtlMs) {
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
        return value;
    }
    getOrSet(key, producer, ttlMs) {
        const cached = this.get(key);
        if (cached !== undefined)
            return Promise.resolve(cached);
        return producer().then((value) => {
            this.set(key, value, ttlMs);
            return value;
        });
    }
    pruneExpired() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (entry.expiresAt <= now) {
                this.store.delete(key);
            }
        }
    }
    clear() {
        this.store.clear();
    }
}
