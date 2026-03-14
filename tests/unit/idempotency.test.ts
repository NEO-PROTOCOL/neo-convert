// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  getIdempotencyKey,
  getCachedResponse,
  cacheResponse,
  withIdempotency,
  clearIdempotencyCache,
  getIdempotencyCacheStats,
} from "@/lib/idempotency";

describe("idempotency", () => {
  beforeEach(() => {
    clearIdempotencyCache();
  });

  describe("getIdempotencyKey", () => {
    it("extracts idempotency key from header", () => {
      const req = new NextRequest("https://example.com/api/test", {
        headers: { "idempotency-key": "test-key-12345678" },
      });

      expect(getIdempotencyKey(req)).toBe("test-key-12345678");
    });

    it("extracts from x-idempotency-key header", () => {
      const req = new NextRequest("https://example.com/api/test", {
        headers: { "x-idempotency-key": "test-key-12345678" },
      });

      expect(getIdempotencyKey(req)).toBe("test-key-12345678");
    });

    it("returns null if no key provided", () => {
      const req = new NextRequest("https://example.com/api/test");
      expect(getIdempotencyKey(req)).toBeNull();
    });

    it("rejects keys that are too short", () => {
      const req = new NextRequest("https://example.com/api/test", {
        headers: { "idempotency-key": "short" },
      });

      expect(getIdempotencyKey(req)).toBeNull();
    });

    it("rejects keys with invalid characters", () => {
      const req = new NextRequest("https://example.com/api/test", {
        headers: { "idempotency-key": "invalid key with spaces!" },
      });

      expect(getIdempotencyKey(req)).toBeNull();
    });
  });

  describe("caching", () => {
    it("caches and retrieves responses", async () => {
      const key = "test-key-12345678";
      const response = NextResponse.json({ success: true }, { status: 200 });
      
      await cacheResponse(key, response);
      
      const cached = getCachedResponse(key);
      expect(cached).not.toBeNull();
      expect(cached?.headers.get("X-Idempotency-Replay")).toBe("true");
    });

    it("returns null for non-existent keys", () => {
      const cached = getCachedResponse("non-existent-key");
      expect(cached).toBeNull();
    });
  });

  describe("withIdempotency", () => {
    it("processes request normally without idempotency key", async () => {
      const req = new NextRequest("https://example.com/api/test");
      let handlerCalled = false;

      const response = await withIdempotency(req, async () => {
        handlerCalled = true;
        return NextResponse.json({ result: "ok" });
      });

      expect(handlerCalled).toBe(true);
      expect(response.status).toBe(200);
    });

    it("calls handler on first request with idempotency key", async () => {
      const req = new NextRequest("https://example.com/api/test", {
        headers: { "idempotency-key": "test-key-12345678" },
      });
      let handlerCalls = 0;

      const response = await withIdempotency(req, async () => {
        handlerCalls++;
        return NextResponse.json({ result: "ok" });
      });

      expect(handlerCalls).toBe(1);
      expect(response.status).toBe(200);
    });

    it("returns cached response on duplicate request", async () => {
      const key = "test-key-12345678";
      const req1 = new NextRequest("https://example.com/api/test", {
        headers: { "idempotency-key": key },
      });
      const req2 = new NextRequest("https://example.com/api/test", {
        headers: { "idempotency-key": key },
      });
      
      let handlerCalls = 0;

      // First request
      await withIdempotency(req1, async () => {
        handlerCalls++;
        return NextResponse.json({ result: "ok", timestamp: Date.now() });
      });

      // Second request with same key
      const response2 = await withIdempotency(req2, async () => {
        handlerCalls++;
        return NextResponse.json({ result: "different" });
      });

      expect(handlerCalls).toBe(1); // Handler should only be called once
      expect(response2.headers.get("X-Idempotency-Replay")).toBe("true");
    });

    it("does not cache error responses", async () => {
      const key = "test-key-error";
      const req = new NextRequest("https://example.com/api/test", {
        headers: { "idempotency-key": key },
      });

      await withIdempotency(req, async () => {
        return NextResponse.json({ error: "failed" }, { status: 400 });
      });

      const cached = getCachedResponse(key);
      expect(cached).toBeNull(); // Should not cache error responses
    });
  });

  describe("pruneExpired", () => {
    it("prunes expired entries after PRUNE_INTERVAL calls regardless of store size", async () => {
      // Cache an entry with real timers
      const key = "test-key-prune-12345";
      const response = NextResponse.json({ ok: true }, { status: 200 });
      cacheResponse(key, response);

      // Wait for async caching
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify entry is active
      const statsBeforePrune = getIdempotencyCacheStats();
      expect(statsBeforePrune.active).toBe(1);
      expect(statsBeforePrune.expired).toBe(0);

      // Mock Date.now to return a time 25 hours in the future so entry appears expired
      const futureTime = Date.now() + 25 * 60 * 60 * 1000;
      const dateSpy = vi.spyOn(Date, "now").mockReturnValue(futureTime);

      try {
        // Verify entry now appears expired
        const statsExpired = getIdempotencyCacheStats();
        expect(statsExpired.expired).toBe(1);

        // Call getCachedResponse 100 times to trigger the PRUNE_INTERVAL
        for (let i = 0; i < 100; i++) {
          getCachedResponse(`non-existent-${i}`);
        }

        // The expired entry should have been pruned
        const statsAfterPrune = getIdempotencyCacheStats();
        expect(statsAfterPrune.total).toBe(0);
        expect(statsAfterPrune.expired).toBe(0);
      } finally {
        dateSpy.mockRestore();
      }
    });
  });
});
