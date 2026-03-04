"use client";
import Link from "next/link";

const TOOLS = [
  { icon: "🗜️", label: "Comprimir PDF", desc: "Reduza o tamanho sem perder qualidade", href: "/tools/compress-pdf", color: "#00ff9d", tag: "Popular" },
  { icon: "🔀", label: "Mesclar PDF", desc: "Una vários PDFs em um único arquivo", href: "/tools/merge-pdf", color: "#7b2fff" },
  { icon: "✂️", label: "Dividir PDF", desc: "Separe páginas específicas do seu PDF", href: "/tools/split-pdf", color: "#0ea5e9" },
  { icon: "🔄", label: "PDF para Word", desc: "Converta PDF editável para DOCX", href: "/tools/pdf-to-word", color: "#ff6b35", tag: "Novo" },
  { icon: "📝", label: "Word para PDF", desc: "Transforme documentos Word em PDF", href: "/tools/word-to-pdf", color: "#00ff9d" },
  { icon: "✍️", label: "Assinar PDF", desc: "Assinatura eletrônica válida juridicamente", href: "/tools/sign-pdf", color: "#7b2fff", tag: "Pro" },
  { icon: "🖼️", label: "JPG para PDF", desc: "Converta imagens para PDF facilmente", href: "/tools/jpg-to-pdf", color: "#0ea5e9" },
  { icon: "🔒", label: "Proteger PDF", desc: "Adicione senha ao seu documento", href: "/tools/protect-pdf", color: "#ff2d55" },
  { icon: "📊", label: "Excel para PDF", desc: "Planilhas em formato PDF preservado", href: "/tools/excel-to-pdf", color: "#00ff9d" },
  { icon: "🗑️", label: "Deletar páginas", desc: "Remova páginas indesejadas do PDF", href: "/tools/delete-pages", color: "#7b2fff" },
  { icon: "↩️", label: "Rotacionar PDF", desc: "Gire páginas na orientação correta", href: "/tools/rotate-pdf", color: "#0ea5e9" },
  { icon: "🤖", label: "Resumir com IA", desc: "Resuma documentos longos com IA", href: "/tools/ai-summary", color: "#ff6b35", tag: "IA" },
];

export default function ToolGrid() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
      gap: 16,
    }} id="tools">
      {TOOLS.map((tool) => (
        <Link key={tool.href} href={tool.href} className="tool-card" style={{ position: "relative" }}>
          {tool.tag && (
            <span style={{
              position: "absolute", top: 16, right: 16,
              padding: "2px 8px", borderRadius: "var(--radius-full)",
              fontSize: 10, fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              background: tool.tag === "IA" ? "rgba(255,107,53,0.15)" :
                          tool.tag === "Pro" ? "var(--neo-purple-dim)" : "var(--neo-green-dim)",
              color: tool.tag === "IA" ? "#ff6b35" :
                     tool.tag === "Pro" ? "var(--neo-purple)" : "var(--neo-green)",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>{tool.tag}</span>
          )}

          <div className="tool-icon" style={{
            background: `${tool.color}18`,
            border: `1px solid ${tool.color}30`,
          }}>
            {tool.icon}
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: "var(--text-primary)" }}>
              {tool.label}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {tool.desc}
            </div>
          </div>

          <div style={{
            marginTop: "auto",
            fontSize: 12, fontWeight: 600,
            color: tool.color,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            Usar now →
          </div>
        </Link>
      ))}
    </div>
  );
}
