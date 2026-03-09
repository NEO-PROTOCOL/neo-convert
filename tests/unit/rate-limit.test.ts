// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { enforceRateLimit } from "@/lib/rate-limit";

type RateLimitGlobal = typeof globalThis & {
  __neoConvertRateLimitStore?: Map<string, { count: number; resetAt: number }>;
};

describe("enforceRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
    (globalThis as RateLimitGlobal).__neoConvertRateLimitStore?.clear();
  });

  it("allows requests until the limit is reached", () => {
    expect(enforceRateLimit("checkout:ip-1", 2, 1_000)).toMatchObject({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 0,
    });

    expect(enforceRateLimit("checkout:ip-1", 2, 1_000)).toMatchObject({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 0,
    });

    expect(enforceRateLimit("checkout:ip-1", 2, 1_000)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it("resets the window after expiration", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));

    expect(enforceRateLimit("upload:ip-2", 1, 1_000).allowed).toBe(true);
    expect(enforceRateLimit("upload:ip-2", 1, 1_000).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);

    expect(enforceRateLimit("upload:ip-2", 1, 1_000)).toMatchObject({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 0,
    });
  });
});
