interface RateLimitEntry {
    count: number;
    resetAt: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
}

declare global {
    var __neoConvertRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const store = global.__neoConvertRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!global.__neoConvertRateLimitStore) {
    global.__neoConvertRateLimitStore = store;
}

function pruneExpired(now: number): void {
    if (store.size <= 4000) return;
    for (const [key, value] of store.entries()) {
        if (value.resetAt <= now) {
            store.delete(key);
        }
    }
}

export function enforceRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    pruneExpired(now);

    const current = store.get(key);
    if (!current || current.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return {
            allowed: true,
            remaining: Math.max(limit - 1, 0),
            retryAfterSeconds: 0,
        };
    }

    if (current.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
        };
    }

    current.count += 1;
    store.set(key, current);

    return {
        allowed: true,
        remaining: Math.max(limit - current.count, 0),
        retryAfterSeconds: 0,
    };
}
