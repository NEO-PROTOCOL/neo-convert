import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { validateCheckoutSession } from "@/lib/checkout-session";
import { validateDownloadToken } from "@/lib/download-token";
import { getClientIp, isSameOriginRequest, safeFilename } from "@/lib/security";
import { enforceRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DOWNLOAD_RATE_LIMIT = 40;
const DOWNLOAD_WINDOW_MS = 15 * 60 * 1000;

function getBlobToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.neo_READ_WRITE_TOKEN || null;
}

export async function GET(request: NextRequest): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rateLimit = enforceRateLimit(
    `checkout-session-download:${ip}`,
    DOWNLOAD_RATE_LIMIT,
    DOWNLOAD_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de download. Aguarde." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const sessionToken = request.nextUrl.searchParams.get("session");
  const fileIndexRaw = request.nextUrl.searchParams.get("file");
  const downloadToken = request.headers.get("x-download-token");

  const session = sessionToken ? validateCheckoutSession(sessionToken) : { valid: false as const };
  const access = downloadToken ? validateDownloadToken(downloadToken) : { valid: false as const };

  if (!session.valid || !access.valid) {
    return NextResponse.json(
      { error: "Sessão de checkout ou autorização de download inválida." },
      { status: 403 },
    );
  }

  if (access.planId !== session.payload.planId) {
    return NextResponse.json(
      { error: "Plano da autorização não corresponde à sessão." },
      { status: 403 },
    );
  }

  const fileIndex = fileIndexRaw ? Number.parseInt(fileIndexRaw, 10) : Number.NaN;
  if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex >= session.payload.files.length) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  }

  const blobToken = getBlobToken();
  if (!blobToken) {
    return NextResponse.json(
      { error: "Storage indisponível para liberar download." },
      { status: 503 },
    );
  }

  const file = session.payload.files[fileIndex];

  try {
    const blob = await get(file.pathname, {
      access: "private",
      token: blobToken,
      useCache: false,
    });

    if (!blob || !blob.stream) {
      return NextResponse.json(
        { error: "Arquivo não encontrado ou expirado." },
        { status: 404 },
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", file.contentType || "application/octet-stream");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${safeFilename(file.name, "arquivo")}"`,
    );
    headers.set("Cache-Control", "no-store");

    return new Response(blob.stream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Erro ao liberar download de sessão:", error);
    return NextResponse.json(
      { error: "Falha ao preparar download do arquivo." },
      { status: 500 },
    );
  }
}
