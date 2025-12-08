export type CacheEntry<T> = {
    value: T;
    expiresAt: number;
};
export declare class OpsAICache {
    private defaultTtlMs;
    private store;
    constructor(defaultTtlMs?: number);
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T, ttlMs?: number): T;
    getOrSet<T>(key: string, producer: () => Promise<T>, ttlMs?: number): Promise<T>;
    pruneExpired(): void;
    clear(): void;
}
//# sourceMappingURL=cache.d.ts.map