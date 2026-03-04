"use client";
import { useState, useCallback, useEffect, useRef } from "react";

const MAX_SIZE_BYTES = 50 * 1024 * 1024;

export default function UploadZone() {
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    if (!file.size || file.size > MAX_SIZE_BYTES) return;

    setLoading(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => { setLoading(false); }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <label
      className={`upload-zone ${drag ? "drag-active" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if(f) handleFile(f); }}
    >
      <input type="file" accept=".pdf,.doc,.docx,.jpg,.png,.jpeg" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if(f) handleFile(f); }} />

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 48, height: 48,
            border: "3px solid var(--border-accent)",
            borderTopColor: "var(--neo-green)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>Analisando arquivo...</p>
        </div>
      ) : (
        <>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "var(--bg-surface)",
            border: "2px solid var(--border-accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "var(--neo-green-glow)",
            fontSize: 32,
          }}>📄</div>

          <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>
            {drag ? "Solte aqui! 🎯" : "Arraste seu arquivo aqui"}
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 28 }}>
            PDF, Word, JPG, PNG — até 50 MB
          </p>

          <div className="btn-primary" style={{ display: "inline-flex" }}>
            ⬆️ &nbsp; Selecionar arquivo
          </div>

          <p style={{
            marginTop: 20, fontSize: 11, color: "var(--text-muted)",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            🔒 Seus arquivos são criptografados e deletados em 1 hora
          </p>
        </>
      )}
    </label>
  );
}
