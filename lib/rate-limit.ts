import { ensureTursoSchema, getTurso } from "./turso";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Rate limiter backed by Turso (libSQL). Atomic counter increment via
 * `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, so concurrent serverless
 * invocations cannot race past the configured limit.
 */
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  await ensureTursoSchema();
  const client = getTurso();
  const now = Date.now();
  const newReset = now + windowMs;

  const result = await client.execute({
    sql: `
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at <= ? THEN ? ELSE rate_limits.reset_at END
      RETURNING count, reset_at
    `,
    args: [key, newReset, now, now, newReset],
  });

  const row = result.rows[0];
  const count = Number(row?.count ?? 1);
  const resetAt = Number(row?.reset_at ?? newReset);

  if (count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((resetAt - now) / 1000), 1),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(limit - count, 0),
    retryAfterSeconds: 0,
  };
}
