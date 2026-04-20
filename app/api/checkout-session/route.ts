import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, validateCheckoutSession } from "@/lib/checkout-session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp, isSameOriginRequest, safeFilename } from "@/lib/security";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const SESSION_RATE_LIMIT = 12;
const SESSION_WINDOW_MS = 15 * 60 * 1000;
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

function getBlobToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.neo_READ_WRITE_TOKEN || null;
}

function sanitizeReturnToPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.length > 200) return null;
  return trimmed;
}

function sanitizePlanId(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[a-z0-9-]{2,32}$/i.test(trimmed) ? trimmed : null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const token = request.nextUrl.searchParams.get("session");
  const session = token ? validateCheckoutSession(token) : { valid: false as const };

  if (!session.valid) {
    return NextResponse.json({ error: "Sessão de checkout inválida ou expirada." }, { status: 400 });
  }

  const response = NextResponse.json({
    planId: session.payload.planId,
    returnToPath: session.payload.returnToPath,
    expiresAt: session.payload.expiresAt,
    files: session.payload.files.map((file, index) => ({
      id: String(index),
      name: file.name,
      contentType: file.contentType,
      size: file.size,
    })),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rateLimit = await enforceRateLimit(
    `checkout-session:${ip}`,
    SESSION_RATE_LIMIT,
    SESSION_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde antes de gerar nova sessão." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const token = getBlobToken();
  if (!token) {
    return NextResponse.json(
      { error: "Storage indisponível para criar sessão de checkout." },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const planId = sanitizePlanId(formData.get("planId"));
    const returnToPath = sanitizeReturnToPath(formData.get("returnToPath"));
    const fileEntries = formData.getAll("file");

    if (!planId || !returnToPath || fileEntries.length === 0) {
      return NextResponse.json(
        { error: "planId, returnToPath e pelo menos um arquivo são obrigatórios." },
        { status: 400 },
      );
    }

    const files = await Promise.all(
      fileEntries.map(async (entry, index) => {
        if (!(entry instanceof File)) {
          throw new Error("Arquivo inválido na sessão de checkout.");
        }

        if (!entry.size || entry.size > MAX_UPLOAD_BYTES) {
          throw new Error(`Arquivo inválido ou maior que 50 MB: ${entry.name}`);
        }

        if (!ALLOWED_CONTENT_TYPES.has(entry.type)) {
          throw new Error(`Tipo de arquivo não permitido: ${entry.type || entry.name}`);
        }

        const filename = safeFilename(entry.name, `arquivo-${index + 1}`);
        const pathname = `checkout-sessions/${Date.now()}-${randomUUID()}/${filename}`;

        const blob = await put(pathname, entry, {
          access: "private",
          contentType: entry.type,
          addRandomSuffix: false,
          token,
        });

        return {
          name: filename,
          pathname: blob.pathname,
          contentType: blob.contentType || entry.type || "application/octet-stream",
          size: entry.size,
        };
      }),
    );

    const sessionToken = createCheckoutSession({
      planId,
      returnToPath,
      files,
    });

    const response = NextResponse.json({
      session: sessionToken,
      checkoutUrl: `/checkout?plan=${encodeURIComponent(planId)}&session=${encodeURIComponent(sessionToken)}`,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Erro ao criar sessão de checkout:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao preparar o arquivo para checkout.",
      },
      { status: 500 },
    );
  }
}
