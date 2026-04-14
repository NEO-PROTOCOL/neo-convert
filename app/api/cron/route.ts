import { del, list } from "@vercel/blob";
import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";

const CRON_RATE_LIMIT = 30;
const CRON_WINDOW_MS = 60 * 1000;
const MAX_SCAN_PAGES = 20;
const DEFAULT_RETENTION_MS = 60 * 60 * 1000;

function isAuthorizedCronRequest(
  authHeader: string | null,
  secret: string,
): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const providedSecret = authHeader.slice("Bearer ".length);

  const providedBuffer = Buffer.from(providedSecret);
  const expectedBuffer = Buffer.from(secret);
  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function resolveRetentionMs(): number {
  const raw = process.env.BLOB_RETENTION_MS;
  if (!raw) return DEFAULT_RETENTION_MS;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_RETENTION_MS;

  const min = 5 * 60 * 1000;
  const max = 7 * 24 * 60 * 60 * 1000;
  return Math.min(Math.max(parsed, min), max);
}

export async function GET(req: NextRequest) {
  // Auth check FIRST — before rate limit to prevent unauthenticated requests
  // from consuming rate limit slots or blocking legitimate cron calls.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET não configurado");
    return NextResponse.json(
      { ok: false, error: "Cron secret missing" },
      { status: 500 },
    );
  }

  if (!isAuthorizedCronRequest(req.headers.get("Authorization"), cronSecret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(
    `cron:${ip}`,
    CRON_RATE_LIMIT,
    CRON_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too Many Requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const retentionMs = resolveRetentionMs();

  try {
    console.log("Iniciando limpeza programada...");

    const now = Date.now();
    const toDelete: string[] = [];
    let totalScanned = 0;
    let pagesRead = 0;
    let cursor: string | undefined;
    let hasMore = true;

    const MOBILE_RETENTION_MS = 24 * 60 * 60 * 1000;

    while (hasMore && pagesRead < MAX_SCAN_PAGES) {
      const page = await list({ cursor, limit: 1000 });
      totalScanned += page.blobs.length;
      pagesRead += 1;

      for (const blob of page.blobs) {
        const age = now - blob.uploadedAt.getTime();
        const isMobileFile = blob.pathname.startsWith("mob-");
        const currentRetention = isMobileFile
          ? MOBILE_RETENTION_MS
          : retentionMs;

        if (age > currentRetention) {
          toDelete.push(blob.url);
        }
      }

      hasMore = page.hasMore;
      cursor = page.cursor;
    }

    if (toDelete.length > 0) {
      console.log(`Deletando ${toDelete.length} arquivos expirados...`);
      await del(toDelete);
    }

    return NextResponse.json({
      ok: true,
      cleaned: toDelete.length,
      totalScanned,
      retentionMs,
      hasMore,
      pagesRead,
    });
  } catch (error) {
    console.error("Erro no cron de limpeza:", error);
    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
