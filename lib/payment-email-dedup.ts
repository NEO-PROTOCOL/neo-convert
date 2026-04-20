import { SECURITY } from "./constants";
import { ensureTursoSchema, getTurso } from "./turso";

/**
 * Atomic "mark-if-first" dedup for payment confirmation emails, backed by
 * Turso (libSQL). Uses INSERT OR IGNORE so only one caller per chargeId
 * succeeds — even across concurrent serverless invocations / cold starts.
 *
 * Expired rows (older than SECURITY.EMAIL_DEDUPE_WINDOW_MS) are removed by
 * the daily cron via lib/turso.ts#cleanupExpiredTurso.
 *
 * Returns true if this was the first call for the chargeId (email should
 * be sent now). Returns false if the email was already sent.
 */
export async function markPaymentEmailSentIfFirst(
  chargeId: string,
): Promise<boolean> {
  await ensureTursoSchema();
  const client = getTurso();
  const now = Date.now();

  const result = await client.execute({
    sql: `INSERT OR IGNORE INTO sent_payment_emails (charge_id, sent_at, expires_at)
          VALUES (?, ?, ?)`,
    args: [chargeId, now, now + SECURITY.EMAIL_DEDUPE_WINDOW_MS],
  });

  return (result.rowsAffected ?? 0) > 0;
}
