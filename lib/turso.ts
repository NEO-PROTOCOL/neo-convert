import { createClient, type Client } from "@libsql/client";

/**
 * Turso (libSQL) client + idempotent schema bootstrap.
 *
 * Env vars:
 *   - TURSO_DATABASE_URL  (e.g. libsql://neo-convert-xxx.turso.io)
 *   - TURSO_AUTH_TOKEN
 *
 * Dev fallback: if TURSO_DATABASE_URL is absent, uses a local SQLite file
 * (`file:./.turso-dev.db`). This keeps `pnpm dev` and tests working without
 * provisioning cloud infrastructure.
 */

declare global {
  var __neoConvertTursoClient: Client | undefined;
  var __neoConvertTursoReady: Promise<void> | undefined;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS rate_limits (
     key TEXT PRIMARY KEY,
     count INTEGER NOT NULL,
     reset_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_rate_limits_reset
     ON rate_limits(reset_at)`,

  `CREATE TABLE IF NOT EXISTS download_tokens (
     token TEXT PRIMARY KEY,
     correlation_id TEXT NOT NULL,
     plan_id TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL,
     used INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE INDEX IF NOT EXISTS idx_download_tokens_expires
     ON download_tokens(expires_at)`,

  `CREATE TABLE IF NOT EXISTS sent_payment_emails (
     charge_id TEXT PRIMARY KEY,
     sent_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_sent_emails_expires
     ON sent_payment_emails(expires_at)`,
];

function buildClient(): Client {
  // Test env → in-memory SQLite (isolated per worker process, no file locks).
  // Dev fallback → local file. Prod → TURSO_DATABASE_URL.
  const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
  const fallback = isTest ? ":memory:" : "file:./.turso-dev.db";
  const url = process.env.TURSO_DATABASE_URL ?? fallback;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  return createClient(
    authToken ? { url, authToken } : { url },
  );
}

export function getTurso(): Client {
  if (!globalThis.__neoConvertTursoClient) {
    globalThis.__neoConvertTursoClient = buildClient();
  }
  return globalThis.__neoConvertTursoClient;
}

/**
 * Ensures the schema exists. Idempotent and cached per process (cold start).
 * Call at the start of any function that touches KV-like tables.
 */
export async function ensureTursoSchema(): Promise<void> {
  if (!globalThis.__neoConvertTursoReady) {
    const client = getTurso();
    globalThis.__neoConvertTursoReady = (async () => {
      for (const stmt of SCHEMA_STATEMENTS) {
        await client.execute(stmt);
      }
    })().catch((error) => {
      // Reset cache so a retry can reattempt init.
      globalThis.__neoConvertTursoReady = undefined;
      throw error;
    });
  }
  await globalThis.__neoConvertTursoReady;
}

/**
 * Cleanup hook for expired rows. Called by the daily cron.
 * Returns the total number of rows deleted.
 */
export async function cleanupExpiredTurso(now: number = Date.now()): Promise<number> {
  await ensureTursoSchema();
  const client = getTurso();

  const results = await client.batch(
    [
      { sql: "DELETE FROM rate_limits WHERE reset_at <= ?", args: [now] },
      { sql: "DELETE FROM download_tokens WHERE expires_at <= ?", args: [now] },
      { sql: "DELETE FROM sent_payment_emails WHERE expires_at <= ?", args: [now] },
    ],
    "write",
  );

  return results.reduce((acc, r) => acc + (r.rowsAffected ?? 0), 0);
}
