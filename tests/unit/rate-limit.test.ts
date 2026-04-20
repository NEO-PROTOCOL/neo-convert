// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ensureTursoSchema, getTurso } from "@/lib/turso";

describe("enforceRateLimit", () => {
  beforeEach(async () => {
    vi.useRealTimers();
    await ensureTursoSchema();
    await getTurso().execute("DELETE FROM rate_limits");
  });

  it("allows requests until the limit is reached", async () => {
    expect(await enforceRateLimit("checkout:ip-1", 2, 1_000)).toMatchObject({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 0,
    });

    expect(await enforceRateLimit("checkout:ip-1", 2, 1_000)).toMatchObject({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 0,
    });

    expect(await enforceRateLimit("checkout:ip-1", 2, 1_000)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it("resets the window after expiration", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));

    expect((await enforceRateLimit("upload:ip-2", 1, 1_000)).allowed).toBe(true);
    expect((await enforceRateLimit("upload:ip-2", 1, 1_000)).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);

    expect(await enforceRateLimit("upload:ip-2", 1, 1_000)).toMatchObject({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 0,
    });
  });
});
