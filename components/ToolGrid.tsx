"use client";
import Link from "next/link";

const TOOLS = [
  {
    icon: "🗜️",
    label: "Comprimir PDF",
    desc: "Reduza o tamanho sem perder qualidade",
    href: "/tools/compress-pdf",
    color: "#00ff9d",
    tag: "Ativo",
    active: true,
  },
  {
    icon: "🔀",
    label: "Mesclar PDF",
    desc: "Una vários PDFs em um único arquivo",
    href: "/tools/merge-pdf",
    color: "#a87aff",
    active: true,
  },
  {
    icon: "✂️",
    label: "Dividir PDF",
    desc: "Separe páginas específicas do seu PDF",
    href: "/tools/split-pdf",
    color: "#0ea5e9",
    active: false,
  },
  {
    icon: "🔄",
    label: "PDF para Word",
    desc: "Converta PDF editável para DOCX",
    href: "/tools/pdf-to-word",
    color: "#ff6b35",
    active: false,
  },
  {
    icon: "📝",
    label: "Word para PDF",
    desc: "Transforme documentos Word em PDF",
    href: "/tools/word-to-pdf",
    color: "#00ff9d",
    active: false,
  },
  {
    icon: "✍️",
    label: "Assinar PDF",
    desc: "Assinatura eletrônica válida juridicamente",
    href: "/tools/sign-pdf",
    color: "#a87aff",
    active: false,
  },
  {
    icon: "🖼️",
    label: "JPG para PDF",
    desc: "Converta imagens para PDF facilmente",
    href: "/tools/jpg-to-pdf",
    color: "#0ea5e9",
    active: true,
  },
  {
    icon: "🔒",
    label: "Proteger PDF",
    desc: "Adicione senha ao seu documento",
    href: "/tools/protect-pdf",
    color: "#ff2d55",
    active: false,
  },
  {
    icon: "📊",
    label: "Excel para PDF",
    desc: "Planilhas em formato PDF preservado",
    href: "/tools/excel-to-pdf",
    color: "#00ff9d",
    active: false,
  },
  {
    icon: "🗑️",
    label: "Deletar páginas",
    desc: "Remova páginas indesejadas do PDF",
    href: "/tools/delete-pages",
    color: "#a87aff",
    active: false,
  },
  {
    icon: "↩️",
    label: "Rotacionar PDF",
    desc: "Gire páginas na orientação correta",
    href: "/tools/rotate-pdf",
    color: "#0ea5e9",
    active: false,
  },
  {
    icon: "🤖",
    label: "Resumir com IA",
    desc: "Resuma documentos longos com IA",
    href: "/tools/ai-summary",
    color: "#ff6b35",
    active: false,
  },
];

export default function ToolGrid() {
  const orderedTools = [...TOOLS].sort(
    (a, b) => Number(b.active) - Number(a.active),
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 16,
      }}
      id="tools"
    >
      {orderedTools.map((tool) => {
        const badge = tool.active ? (tool.tag ?? "Disponível") : "Em breve";
        const badgeBg = tool.active
          ? "var(--neo-green-dim)"
          : "rgba(148,163,184,0.18)";
        const badgeColor = tool.active
          ? "var(--neo-green)"
          : "rgba(248,248,255,0.72)";

        const content = (
          <>
            {badge && (
              <span
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-full)",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: badgeBg,
                  color: badgeColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {badge}
              </span>
            )}

            <div
              className="tool-icon"
              style={{
                background: `${tool.color}18`,
                border: `1px solid ${tool.color}30`,
              }}
            >
              {tool.icon}
            </div>

            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  marginBottom: 4,
                  color: "var(--text-primary)",
                }}
              >
                {tool.label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {tool.desc}
              </div>
            </div>

            <div
              style={{
                marginTop: "auto",
                fontSize: 12,
                fontWeight: 600,
                color: tool.active ? tool.color : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {tool.active ? "Pagar e usar →" : "Indisponível no momento"}
            </div>
          </>
        );

        if (tool.active) {
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="tool-card active"
              style={{ position: "relative" }}
            >
              {content}
            </Link>
          );
        }

        return (
          <div
            key={tool.href}
            className="tool-card inactive"
            style={{ position: "relative" }}
            aria-disabled="true"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
