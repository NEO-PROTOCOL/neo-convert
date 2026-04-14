import { NextRequest, NextResponse } from "next/server";
import { scanImageFromUrl } from "@/lib/ocr-service";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "URL da imagem não fornecida." },
        { status: 400 }
      );
    }

    // Aqui poderíamos validar se o usuário é "Pro" no futuro
    // Por enquanto, vamos permitir o processamento
    const text = await scanImageFromUrl(imageUrl);

    return NextResponse.json({ text });
  } catch (error) {
    logger.error("Erro na rota de API OCR", {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { error: "Falha ao processar OCR. Tente novamente." },
      { status: 500 }
    );
  }
}
