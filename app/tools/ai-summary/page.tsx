"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import ToolPage from "@/components/ToolPage";
import { logger } from "@/lib/logger";

// Estado de carregamento
const LoadingState = () => (
  <div style={{ textAlign: "center", padding: "40px 0" }}>
    <div className="spinner" style={{ margin: "0 auto 16px" }} />
    <p style={{ color: "var(--text-secondary)" }}>Lendo documento com OCR...</p>
  </div>
);

// Estado de erro com botão de tentar novamente
const ErrorState = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => (
  <div style={{ color: "var(--neo-red)", textAlign: "center" }}>
    <p>⚠️ {error}</p>
    <button
      onClick={onRetry}
      className="btn-secondary"
      style={{ marginTop: 12 }}
    >
      Tentar novamente
    </button>
  </div>
);

// Estado de sucesso com texto extraído e ações
const SuccessState = ({ text }: { text: string }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    alert("Texto copiado para a área de transferência!");
  };

  const handleSummarize = () => {
    alert("Função de resumo por IA em breve!");
  };

  return (
    <div>
      <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
        Texto Extraído:
      </h3>
      <div
        style={{
          background: "var(--bg-surface)",
          padding: 16,
          borderRadius: 8,
          maxHeight: 400,
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          fontSize: 14,
          border: "1px solid var(--border-accent)",
          color: "var(--text-primary)",
        }}
      >
        {text || "Nenhum texto detectado na imagem."}
      </div>
      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <button className="btn-primary" onClick={handleSummarize}>
          ✨ Gerar Resumo (Pro)
        </button>
        <button className="btn-secondary" onClick={handleCopy}>
          📋 Copiar Texto
        </button>
      </div>
    </div>
  );
};

// Hook customizado para gerenciar OCR
const useOcr = (imageUrl: string | null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const hasAttempted = useRef(false);

  const performOcr = useCallback(async () => {
    if (!imageUrl || loading || extractedText !== null) return;

    setLoading(true);
    setError(null);
    hasAttempted.current = true;

    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        body: JSON.stringify({ imageUrl }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Falha ao extrair texto da imagem.");

      const data = await res.json();
      setExtractedText(data.text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(message);
      logger.error("Erro no processamento de OCR na página", { err });
    } finally {
      setLoading(false);
    }
  }, [imageUrl, loading, extractedText]);

  // Reseta tentativa quando a URL muda
  useEffect(() => {
    hasAttempted.current = false;
    setExtractedText(null);
    setError(null);
  }, [imageUrl]);

  // Dispara automaticamente quando imageUrl muda, mas apenas uma vez por URL
  useEffect(() => {
    if (imageUrl && !hasAttempted.current && !loading && extractedText === null) {
      performOcr();
    }
  }, [imageUrl, performOcr, loading, extractedText]);

  return { loading, error, extractedText, retry: performOcr };
};

// Componente de conteúdo interno
function AiSummaryContent() {
  const searchParams = useSearchParams();
  const fileUrl = searchParams.get("fileUrl");

  const { loading, error, extractedText, retry } = useOcr(fileUrl);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={retry} />;
  if (extractedText !== null) return <SuccessState text={extractedText} />;

  return (
    <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>
      Suba uma imagem para começar o processamento.
    </p>
  );
}

// Página principal
export default function AiSummaryPage() {
  return (
    <ToolPage
      title="Resumir com IA"
      description="Extraímos o texto via OCR e preparamos para o resumo inteligente."
      icon="🤖"
      color="#ff6b35"
    >
      <AiSummaryContent />
    </ToolPage>
  );
}
