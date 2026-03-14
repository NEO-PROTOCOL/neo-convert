/**
 * Request idempotency helper
 * Prevents duplicate processing of the same request
 * 
 * Usage:
 * 1. Client sends Idempotency-Key header with a unique UUID
 * 2. Server checks if this key was already processed
 * 3. If yes, returns cached response
 * 4. If no, processes request and caches the response
 */

import { NextRequest, NextResponse } from "next/server";

interface IdempotencyEntry {
  response: {
    status: number;
    body: unknown;
    headers: Record<string, string>;
  };
  createdAt: number;
  expiresAt: number;
}

declare global {
  var __neoConvertIdempotencyStore: Map<string, IdempotencyEntry> | undefined;
}

const store = global.__neoConvertIdempotencyStore ?? new Map<string, IdempotencyEntry>();
if (!global.__neoConvertIdempotencyStore) {
  global.__neoConvertIdempotencyStore = store;
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ENTRIES = 10_000;
const PRUNE_INTERVAL = 100; // prune every N calls regardless of store size

let pruneCallCount = 0;

/**
 * Prune expired entries to prevent memory bloat.
 * Runs every PRUNE_INTERVAL calls, or immediately when store exceeds MAX_ENTRIES.
 */
function pruneExpired(): void {
  pruneCallCount++;
  const shouldPrune = pruneCallCount >= PRUNE_INTERVAL || store.size > MAX_ENTRIES;
  if (!shouldPrune) return;

  pruneCallCount = 0;
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

/**
 * Extract idempotency key from request headers
 */
export function getIdempotencyKey(req: NextRequest): string | null {
  const key = req.headers.get("idempotency-key") || req.headers.get("x-idempotency-key");
  
  if (!key) return null;
  
  // Validate key format (should be UUID-like or at least 16 chars)
  if (key.length < 16 || key.length > 128) {
    return null;
  }
  
  // Basic sanitization
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    return null;
  }
  
  return key;
}

/**
 * Check if a request with this idempotency key was already processed
 * Returns the cached response if found, null otherwise
 */
export function getCachedResponse(key: string): NextResponse | null {
  pruneExpired();
  
  const entry = store.get(key);
  if (!entry) return null;
  
  // Check if expired
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  
  // Reconstruct response
  const response = NextResponse.json(entry.response.body, {
    status: entry.response.status,
  });
  
  // Restore headers
  for (const [headerName, headerValue] of Object.entries(entry.response.headers)) {
    response.headers.set(headerName, headerValue);
  }
  
  // Add idempotency header
  response.headers.set("X-Idempotency-Replay", "true");
  
  return response;
}

/**
 * Cache a response for the given idempotency key
 */
export async function cacheResponse(key: string, response: NextResponse): Promise<void> {
  pruneExpired();
  
  // Extract relevant headers (skip sensitive ones)
  const headers: Record<string, string> = {};
  const headersToCache = ["content-type", "cache-control", "x-ratelimit-remaining"];
  
  for (const headerName of headersToCache) {
    const value = response.headers.get(headerName);
    if (value) {
      headers[headerName] = value;
    }
  }
  
  // Clone the response and await reading the body before storing
  try {
    const body = await response.clone().json();
    store.set(key, {
      response: {
        status: response.status,
        body,
        headers,
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    });
  } catch {
    // If we can't parse JSON, don't cache
  }
}

/**
 * Middleware wrapper for idempotent API routes
 * 
 * Usage:
 * ```ts
 * export async function POST(req: NextRequest) {
 *   return withIdempotency(req, async () => {
 *     // Your actual handler logic here
 *     const result = await processPayment();
 *     return NextResponse.json(result);
 *   });
 * }
 * ```
 */
export async function withIdempotency(
  req: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const key = getIdempotencyKey(req);
  
  // If no idempotency key, process normally
  if (!key) {
    return handler();
  }
  
  // Check cache
  const cached = getCachedResponse(key);
  if (cached) {
    return cached;
  }
  
  // Process request
  const response = await handler();
  
  // Cache successful responses only (2xx status codes)
  if (response.status >= 200 && response.status < 300) {
    await cacheResponse(key, response);
  }
  
  return response;
}

/**
 * Clear all cached idempotency entries
 * Useful for testing
 */
export function clearIdempotencyCache(): void {
  store.clear();
  pruneCallCount = 0;
}

/**
 * Get cache statistics
 * Useful for monitoring
 */
export function getIdempotencyCacheStats() {
  const now = Date.now();
  let expired = 0;
  let active = 0;
  
  for (const entry of store.values()) {
    if (entry.expiresAt <= now) {
      expired++;
    } else {
      active++;
    }
  }
  
  return {
    total: store.size,
    active,
    expired,
    maxSize: MAX_ENTRIES,
  };
}
