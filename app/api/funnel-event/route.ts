import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getClientIp, isSameOriginRequest } from "@/lib/security";

const ALLOWED_EVENTS = new Set([
  "upload_started",
  "file_processed",
  "preview_viewed",
  "download_clicked",
  "checkout_session_created",
  "checkout_created",
  "qr_viewed",
  "pix_copied",
  "payment_confirmed",
  "download_released",
]);

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type inválido. Use application/json." },
      { status: 415 },
    );
  }

  try {
    const body = (await req.json()) as {
      event?: unknown;
      path?: unknown;
      tool?: unknown;
      ts?: unknown;
      metadata?: unknown;
    };

    const event =
      typeof body.event === "string" ? body.event.trim().toLowerCase() : "";
    if (!ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    logger.info("funnel_event", {
      event,
      path: typeof body.path === "string" ? body.path : null,
      tool: typeof body.tool === "string" ? body.tool : null,
      ts: typeof body.ts === "number" ? body.ts : Date.now(),
      metadata:
        typeof body.metadata === "object" && body.metadata !== null
          ? body.metadata
          : {},
      ip: getClientIp(req),
      ua: req.headers.get("user-agent") ?? null,
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
}
