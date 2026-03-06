import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { validateDownloadToken } from "@/lib/download-token";
import { getClientIp, isSameOriginRequest, safeFilename } from "@/lib/security";

export const maxDuration = 60; // 60 segundos de tolerância para uploads grandes
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const UPLOAD_RATE_LIMIT = 20;
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpg",
  "image/jpeg",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rateLimit = enforceRateLimit(
    `upload:${ip}`,
    UPLOAD_RATE_LIMIT,
    UPLOAD_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições de upload. Aguarde." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  // Verify server-signed download token from payment flow.
  // Token is passed as a header to avoid coupling it to FormData.
  const downloadToken = request.headers.get("x-download-token");
  if (downloadToken) {
    const tokenResult = validateDownloadToken(downloadToken);
    if (!tokenResult.valid) {
      return NextResponse.json(
        { error: "Token de download inválido ou expirado." },
        { status: 403 },
      );
    }
  }

  try {
    const formData = await request.formData();
    const fileField = formData.get("file");

    if (!(fileField instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const file = fileField;

    if (!file.size || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Arquivo inválido ou maior que 50 MB." },
        { status: 413 },
      );
    }

    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido." },
        { status: 415 },
      );
    }

    const filename = safeFilename(file.name, "arquivo");

    const token =
      process.env.BLOB_READ_WRITE_TOKEN || process.env.neo_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          error: "Storage indisponível: BLOB_READ_WRITE_TOKEN não configurado.",
        },
        { status: 503 },
      );
    }

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
      token: token,
    });

    const response = NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Error uploading to Vercel Blob:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
