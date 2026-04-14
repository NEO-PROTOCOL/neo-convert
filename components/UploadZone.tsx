"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

const MAX_SIZE_BYTES = 50 * 1024 * 1024;

interface UploadedFile {
  url: string;
  name: string;
}

export default function UploadZone() {
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    if (!file.size || file.size > MAX_SIZE_BYTES) {
      setError("Arquivo muito grande (limite 50MB)");
      return;
    }

    setLoading(true);
    setError(null);
    setUploaded(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Detect mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      const res = await fetch("/api/upload-to-cloud", {
        method: "POST",
        body: formData,
        headers: {
          "x-is-mobile": isMobile ? "true" : "false",
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro no upload");
      }

      const data = await res.json();
      setUploaded({ url: data.url, name: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao anexar arquivo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentTimeout = timeoutRef.current;
    return () => {
      if (currentTimeout) clearTimeout(currentTimeout);
    };
  }, []);

  if (uploaded) {
    const isPdf = uploaded.name.toLowerCase().endsWith(".pdf");
    const isImage = /\.(jpg|jpeg|png)$/i.test(uploaded.name);

    return (
      <div
        className="upload-zone"
        style={{ cursor: "default", animation: "fadeUp 0.3s ease-out" }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {uploaded.name}
          </h3>
          <p
            style={{ color: "var(--neo-green)", fontSize: 13, fontWeight: 600 }}
          >
            Arquivo pronto para o protocolo
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            width: "100%",
            maxWidth: 400,
            margin: "0 auto",
          }}
        >
          {isPdf && (
            <>
              <Link
                href={`/tools/compress-pdf?fileUrl=${encodeURIComponent(uploaded.url)}&fileName=${encodeURIComponent(uploaded.name)}`}
                className="btn-primary"
                style={{ fontSize: 13, padding: "12px" }}
              >
                🗜️ Comprimir
              </Link>
              <Link
                href={`/tools/split-pdf?fileUrl=${encodeURIComponent(uploaded.url)}&fileName=${encodeURIComponent(uploaded.name)}`}
                className="btn-secondary"
                style={{ fontSize: 13, padding: "12px" }}
              >
                ✂️ Dividir
              </Link>
              <Link
                href={`/tools/merge-pdf?fileUrl=${encodeURIComponent(uploaded.url)}&fileName=${encodeURIComponent(uploaded.name)}`}
                className="btn-secondary"
                style={{ fontSize: 13, padding: "12px" }}
              >
                🔀 Mesclar
              </Link>
              <Link
                href={`/tools/sign-pdf?fileUrl=${encodeURIComponent(uploaded.url)}&fileName=${encodeURIComponent(uploaded.name)}`}
                className="btn-secondary"
                style={{ fontSize: 13, padding: "12px" }}
              >
                ✍️ Assinar
              </Link>
            </>
          )}
          {isImage && (
            <>
              <Link
                href={`/tools/jpg-to-pdf?fileUrl=${encodeURIComponent(uploaded.url)}&fileName=${encodeURIComponent(uploaded.name)}`}
                className="btn-primary"
                style={{ fontSize: 13, padding: "12px", gridColumn: "span 2" }}
              >
                🖼️ Converter para PDF
              </Link>
              <Link
                href={`/tools/ai-summary?fileUrl=${encodeURIComponent(uploaded.url)}&fileName=${encodeURIComponent(uploaded.name)}`}
                className="btn-secondary"
                style={{ fontSize: 13, padding: "12px", gridColumn: "span 2" }}
              >
                🤖 Resumir com IA (OCR)
              </Link>
            </>
          )}
          {!isPdf && !isImage && (
            <Link
              href="/#tools"
              className="btn-primary"
              style={{ fontSize: 13, padding: "12px", gridColumn: "span 2" }}
            >
              Ver ferramentas compatíveis
            </Link>
          )}
        </div>

        <button
          onClick={() => setUploaded(null)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            fontSize: 12,
            marginTop: 20,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Trocar arquivo
        </button>
      </div>
    );
  }

  return (
    <label
      className={`upload-zone ${drag ? "drag-active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
    >
      <input
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.png,.jpeg"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: "3px solid var(--border-accent)",
              borderTopColor: "var(--neo-green)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
            Anexando ao protocolo...
          </p>
        </div>
      ) : (
        <>
          {error && (
            <p style={{ color: "#ff2d55", fontSize: 13, marginBottom: 16 }}>
              ⚠️ {error}
            </p>
          )}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "var(--bg-surface)",
              border: "2px solid var(--border-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "var(--neo-green-glow)",
              fontSize: 32,
            }}
          >
            📄
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 10,
              color: "var(--text-primary)",
            }}
          >
            {drag ? "Solte aqui! 🎯" : "Arraste seu arquivo aqui"}
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 14,
              marginBottom: 28,
            }}
          >
            PDF, Word, JPG, PNG — até 50 MB
          </p>

          <div className="btn-primary" style={{ display: "inline-flex" }}>
            ⬆️ &nbsp; Selecionar arquivo
          </div>

          <p
            style={{
              marginTop: 20,
              fontSize: 11,
              color: "var(--text-muted)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            🔒 Seus arquivos são criptografados e deletados em 1 hora
          </p>
        </>
      )}
    </label>
  );
}
