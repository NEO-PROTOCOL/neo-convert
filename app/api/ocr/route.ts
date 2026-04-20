import { NextRequest, NextResponse } from "next/server";
import { scanImageFromUrl } from "@/lib/ocr-service";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp, isSameOriginRequest } from "@/lib/security";

const VERCEL_BLOB_HOSTNAME_REGEX = /^[a-z0-9.-]+\.public\.blob\.vercel-storage\.com$/i;
const RATE_LIMIT_OCR = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function isSupportedByOCR(pathname: string) {
  const normalizedPath = pathname.toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tiff", ".tif"].some(
    (extension) => normalizedPath.endsWith(extension)
  );
}

function isAllowedBlobImageUrl(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    return (
      url.protocol === "https:" &&
      VERCEL_BLOB_HOSTNAME_REGEX.test(url.hostname) &&
      isSupportedByOCR(url.pathname)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rateLimit = await enforceRateLimit(`ocr:${ip}`, RATE_LIMIT_OCR, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições de OCR. Aguarde um minuto." },
      { status: 429 }
    );
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo da requisição inválido (JSON esperado)." },
        { status: 400 }
      );
    }

    const { imageUrl } = body;

    if (typeof imageUrl !== "string" || !imageUrl.trim()) {
      return NextResponse.json(
        { error: "URL da imagem não fornecida." },
        { status: 400 }
      );
    }

    const normalizedImageUrl = imageUrl.trim();

    if (!isAllowedBlobImageUrl(normalizedImageUrl)) {
      return NextResponse.json(
        { error: "URL da imagem inválida ou formato não suportado (exclusivo para imagens do protocolo)." },
        { status: 400 }
      );
    }

    const text = await scanImageFromUrl(normalizedImageUrl);

    return NextResponse.json({ text });
  } catch (error) {
    logger.error("Erro na rota de API OCR", {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { error: "Falha ao processar OCR no serviço upstream." },
      { status: 502 }
    );
  }
}
