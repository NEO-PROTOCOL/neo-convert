import { logger } from "./logger";

/**
 * OCR Service for processing images and extracting text
 * Uses RapidAPI OCR Scanner (kuriel07)
 */

// Configurações constantes
const DEFAULT_RAPIDAPI_HOST = "ocr-scanner.p.rapidapi.com";
const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png"] as const;

// Tipagem da resposta da API (baseada na documentação do RapidAPI)
interface OCRScanResponse {
  text?: string;
  extracted_text?: string;
  error?: string;
  status?: string;
  [key: string]: unknown; // para flexibilidade caso a API retorne campos adicionais
}

// Validação e cache das variáveis de ambiente
function getRapidApiConfig() {
  const apiKey = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST || DEFAULT_RAPIDAPI_HOST;

  if (!apiKey) {
    logger.error("OCR Service: RAPIDAPI_KEY is not configured");
    throw new Error("Serviço de OCR temporariamente indisponível.");
  }

  return { apiKey, host };
}

/**
 * Extrai o texto da resposta da API, priorizando campos comuns
 */
function extractTextFromResponse(data: OCRScanResponse): string {
  // Prioriza 'text', depois 'extracted_text', ou string vazia
  return data.text ?? data.extracted_text ?? "";
}

/**
 * Scans an image from a public URL and extracts text
 * @param imageUrl Public URL of the image (e.g. Vercel Blob URL)
 * @returns Extracted text or throws an error
 */
export async function scanImageFromUrl(imageUrl: string): Promise<string> {
  const { apiKey, host } = getRapidApiConfig();

  const url = `https://${host}/ScanImageFromURL?url=${encodeURIComponent(imageUrl)}`;

  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": host,
    },
  };

  logger.info("Iniciando processamento de OCR", { imageUrl });

  try {
    const response = await fetch(url, options);

    // Log do status para debug (sem expor dados sensíveis)
    logger.debug("Resposta da API OCR", {
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Falha na chamada da API de OCR", {
        status: response.status,
        statusText: response.statusText,
        errorPreview: errorBody.slice(0, 200), // evita logs gigantes
      });
      throw new Error(`Erro no processamento da imagem (${response.status})`);
    }

    const data = (await response.json()) as OCRScanResponse;

    // Verifica se a resposta indica erro
    if (data.error) {
      logger.error("Erro retornado pelo corpo da API de OCR", {
        error: data.error,
      });
      throw new Error(data.error);
    }

    const extractedText = extractTextFromResponse(data);

    if (!extractedText) {
      logger.warn("OCR concluído mas nenhum texto foi detectado", { imageUrl });
    } else {
      logger.info("OCR concluído com sucesso", {
        textLength: extractedText.length,
        imageUrl,
      });
    }

    return extractedText;
  } catch (error) {
    // Relança o erro com contexto adicional, sem perder a stack original
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Erro inesperado no serviço de OCR", {
      error: message,
      imageUrl,
    });
    throw error;
  }
}

/**
 * Checks if a file is supported by the OCR service
 * @param filename Nome do arquivo (inclui extensão)
 * @returns true se a extensão for suportada
 */
export function isSupportedByOCR(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lowerFilename.endsWith(ext));
}
