#!/bin/bash
# NeoConvert — Setup Script
# Execute: bash ~/neomello/neo-convert/setup.sh

PROJECT="$HOME/neomello/neo-convert"
cd "$PROJECT"

echo "🚀 NeoConvert — Criando estrutura do projeto..."

# ═══ INSTALAR DEPS EXTRAS ═══
pnpm add lucide-react framer-motion react-dropzone pdf-lib

# ═══ CRIAR PASTAS ═══
mkdir -p components lib app/tools/{compress-pdf,merge-pdf,split-pdf,convert-pdf,sign-pdf,pdf-to-word,jpg-to-pdf,compress-image}

# ═══ globals.css ═══
cat > app/globals.css << 'CSSEOF'
@import "tailwindcss";

:root {
  --bg-void: #050508;
  --bg-base: #0a0a0f;
  --bg-surface: #13131a;
  --bg-elevated: #1a1a24;
  --bg-glass: rgba(19, 19, 26, 0.7);
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.1);
  --border-accent: rgba(0, 255, 157, 0.3);
  --border-accent-strong: rgba(0, 255, 157, 0.6);
  --neo-green: #00ff9d;
  --neo-green-dim: rgba(0, 255, 157, 0.12);
  --neo-green-glow: 0 0 24px rgba(0, 255, 157, 0.3);
  --neo-purple: #7b2fff;
  --neo-purple-dim: rgba(123, 47, 255, 0.15);
  --neo-blue: #0ea5e9;
  --text-primary: #e8e8f0;
  --text-secondary: rgba(232, 232, 240, 0.6);
  --text-muted: rgba(232, 232, 240, 0.35);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 32px;
  --radius-full: 9999px;
  --ease-neo: cubic-bezier(0.16, 1, 0.3, 1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }

body {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  background-color: var(--bg-base);
  color: var(--text-primary);
  line-height: 1.6;
  min-height: 100vh;
  overflow-x: hidden;
}

::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: var(--bg-base); }
::-webkit-scrollbar-thumb { background: var(--border-accent); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--neo-green); }
::selection { background: var(--neo-green-dim); color: var(--neo-green); }

.neo-bg-grid {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(0, 255, 157, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 157, 0.025) 1px, transparent 1px);
  background-size: 44px 44px;
}
.neo-orb {
  position: fixed; border-radius: 50%; filter: blur(120px); pointer-events: none; z-index: 0;
}
.neo-orb-1 {
  width: 700px; height: 700px;
  background: radial-gradient(circle, rgba(0, 255, 157, 0.05) 0%, transparent 70%);
  top: -250px; right: -250px;
}
.neo-orb-2 {
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(123, 47, 255, 0.07) 0%, transparent 70%);
  bottom: -200px; left: -200px;
}
.glow-line {
  position: fixed; top: 0; left: 0; right: 0; height: 1px; z-index: 100;
  background: linear-gradient(90deg, transparent 0%, var(--neo-green) 50%, transparent 100%);
  opacity: 0.6;
}

.neo-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px; border-radius: var(--radius-full);
  background: var(--neo-green-dim); border: 1px solid var(--border-accent);
  color: var(--neo-green); font-size: 11px; font-weight: 700;
  font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase;
}
.neo-badge .dot {
  width: 5px; height: 5px; border-radius: 50%; background: var(--neo-green);
  animation: pulse-dot 2s ease-in-out infinite;
}

.upload-zone {
  border: 2px dashed var(--border-accent);
  border-radius: var(--radius-xl);
  padding: 72px 48px;
  text-align: center;
  cursor: pointer;
  transition: all 250ms var(--ease-neo);
  background: var(--neo-green-dim);
  position: relative;
  overflow: hidden;
  display: block;
}
.upload-zone::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(0,255,157,0.04) 0%, transparent 65%);
  pointer-events: none;
}
.upload-zone:hover, .upload-zone.drag-active {
  border-color: var(--neo-green);
  background: rgba(0, 255, 157, 0.07);
  box-shadow: var(--neo-green-glow), inset 0 0 60px rgba(0,255,157,0.04);
}

.tool-card {
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg); padding: 24px; cursor: pointer;
  transition: all 250ms var(--ease-neo); text-decoration: none; color: inherit;
  display: flex; flex-direction: column; gap: 12px;
}
.tool-card:hover {
  border-color: var(--border-accent); background: var(--bg-elevated);
  transform: translateY(-5px);
  box-shadow: 0 24px 48px rgba(0,0,0,0.25), var(--neo-green-glow);
}
.tool-icon {
  width: 52px; height: 52px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; font-size: 22px;
}

.pricing-card {
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl); padding: 40px;
  transition: all 250ms var(--ease-neo);
}
.pricing-card.featured {
  border-color: var(--border-accent-strong); background: var(--bg-elevated);
}

.btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 14px 32px; background: var(--neo-green); color: #000;
  font-weight: 700; font-size: 15px; border-radius: var(--radius-md);
  border: none; cursor: pointer; transition: all 250ms var(--ease-neo);
  text-decoration: none; white-space: nowrap;
}
.btn-primary:hover {
  background: #00e68a; transform: translateY(-2px); box-shadow: var(--neo-green-glow);
}
.btn-secondary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 14px 32px; background: transparent; color: var(--text-primary);
  font-weight: 600; font-size: 15px; border-radius: var(--radius-md);
  border: 1px solid var(--border-default); cursor: pointer;
  transition: all 250ms var(--ease-neo); text-decoration: none;
}
.btn-secondary:hover {
  border-color: var(--border-accent); color: var(--neo-green); background: var(--neo-green-dim);
}

.container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 24px; }
@media (max-width: 768px) { .container { padding: 0 16px; } }

.tag {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: var(--radius-full);
  font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase; letter-spacing: 0.07em;
}
.tag-green { background: var(--neo-green-dim); color: var(--neo-green); }
.tag-purple { background: var(--neo-purple-dim); color: var(--neo-purple); }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.7); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.animate-fade-up { animation: fadeUp 0.5s var(--ease-neo) forwards; }
CSSEOF

echo "✅ globals.css criado"

# ═══ layout.tsx ═══
cat > app/layout.tsx << 'TSXEOF'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeoConvert — PDF Tools Inteligentes",
  description: "Converta, comprima, mescle e assine PDFs com velocidade. Ferramentas premium, sem instalar nada.",
  keywords: ["pdf converter", "comprimir pdf", "juntar pdf", "assinatura digital", "ferramentas pdf grátis"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
TSXEOF

echo "✅ layout.tsx criado"

# ═══ NAVBAR ═══
cat > components/Navbar.tsx << 'TSXEOF'
"use client";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      padding: "0 24px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "rgba(10, 10, 15, 0.85)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto", height: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "var(--neo-green)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "#000",
          }}>N</div>
          <span style={{
            fontSize: 18, fontWeight: 800, color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}>
            Neo<span style={{ color: "var(--neo-green)" }}>Convert</span>
          </span>
        </Link>

        {/* Links desktop */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }} className="nav-desktop">
          {[
            { label: "Ferramentas", href: "#tools" },
            { label: "Preços", href: "#precos" },
            { label: "Blog", href: "/blog" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{
              padding: "8px 14px", borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)", fontSize: 14, fontWeight: 500,
              textDecoration: "none", transition: "all 150ms",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/login" style={{
            padding: "8px 16px", borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)", fontSize: 14, fontWeight: 500,
            textDecoration: "none", border: "none", background: "transparent",
          }}>
            Entrar
          </Link>
          <Link href="#precos" className="btn-primary" style={{ padding: "9px 20px", fontSize: 14 }}>
            Começar grátis
          </Link>
        </div>
      </div>
    </nav>
  );
}
TSXEOF

echo "✅ Navbar criada"

# ═══ UPLOAD ZONE ═══
cat > components/UploadZone.tsx << 'TSXEOF'
"use client";
import { useState, useCallback } from "react";

export default function UploadZone() {
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); }, 2000);
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
TSXEOF

echo "✅ UploadZone criada"

# ═══ TOOL GRID ═══
cat > components/ToolGrid.tsx << 'TSXEOF'
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
TSXEOF

echo "✅ ToolGrid criado"

# ═══ PRICING ═══
cat > components/Pricing.tsx << 'TSXEOF'
"use client";

const PLANS = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "/mês",
    desc: "Para testar as ferramentas",
    features: [
      "5 arquivos por dia",
      "Até 10 MB por arquivo",
      "Compressão básica",
      "Ferramentas essenciais",
    ],
    cta: "Começar grátis",
    href: "/register",
    featured: false,
  },
  {
    name: "Pro",
    price: "R$ 29",
    period: "/mês",
    desc: "Para profissionais e freelas",
    badge: "Mais popular",
    features: [
      "Arquivos ilimitados",
      "Até 100 MB por arquivo",
      "Todas as ferramentas",
      "Assinatura eletrônica",
      "Histórico de 30 dias",
      "Suporte prioritário",
    ],
    cta: "Assinar Pro",
    href: "/register?plan=pro",
    featured: true,
  },
  {
    name: "Business",
    price: "R$ 79",
    period: "/mês",
    desc: "Para times e empresas",
    features: [
      "Tudo do Pro",
      "Até 500 MB por arquivo",
      "API de integração",
      "5 usuários inclusos",
      "Marca personalizada",
      "SLA 99.9%",
    ],
    cta: "Falar com vendas",
    href: "/contato",
    featured: false,
  },
];

export default function Pricing() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 24,
      alignItems: "start",
    }}>
      {PLANS.map((plan) => (
        <div key={plan.name} className={`pricing-card ${plan.featured ? "featured" : ""}`}
          style={{ position: "relative" }}>

          {plan.badge && (
            <div style={{
              position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
              padding: "4px 16px", borderRadius: "var(--radius-full)",
              background: "var(--neo-green)", color: "#000",
              fontSize: 12, fontWeight: 800, whiteSpace: "nowrap",
              fontFamily: "'JetBrains Mono', monospace",
            }}>{plan.badge}</div>
          )}

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{plan.name}</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>{plan.desc}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: plan.featured ? "var(--neo-green)" : "var(--text-primary)" }}>
                {plan.price}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{plan.period}</span>
            </div>
          </div>

          <ul style={{ listStyle: "none", marginBottom: 32, display: "flex", flexDirection: "column", gap: 12 }}>
            {plan.features.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--neo-green)", fontSize: 16, flexShrink: 0 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>

          <a href={plan.href}
            className={plan.featured ? "btn-primary" : "btn-secondary"}
            style={{ width: "100%", justifyContent: "center" }}>
            {plan.cta}
          </a>
        </div>
      ))}
    </div>
  );
}
TSXEOF

echo "✅ Pricing criado"

# ═══ FOOTER ═══
cat > components/Footer.tsx << 'TSXEOF'
export default function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--border-subtle)",
      padding: "48px 24px",
      marginTop: 40,
    }}>
      <div className="container">
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 48, marginBottom: 48,
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: "var(--neo-green)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, color: "#000",
              }}>N</div>
              <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>
                Neo<span style={{ color: "var(--neo-green)" }}>Convert</span>
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7, maxWidth: 260 }}>
              Ferramentas PDF premium para profissionais que valorizam velocidade e segurança.
            </p>
          </div>

          {[
            { title: "Ferramentas", links: ["Comprimir PDF", "Mesclar PDF", "Dividir PDF", "Assinar PDF", "PDF para Word"] },
            { title: "Empresa", links: ["Sobre nós", "Blog", "Preços", "Contato"] },
            { title: "Legal", links: ["Privacidade", "Termos", "Cookies", "Segurança"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {col.title}
              </h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none", transition: "color 150ms" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--text-secondary)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: 24,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            © 2026 NeoConvert. Todos os direitos reservados.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
              built_with 💚
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
TSXEOF

echo "✅ Footer criado"

# ═══ PAGE.TSX PRINCIPAL ═══
cat > app/page.tsx << 'TSXEOF'
"use client";

import Navbar from "@/components/Navbar";
import UploadZone from "@/components/UploadZone";
import ToolGrid from "@/components/ToolGrid";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <div className="neo-bg-grid" />
      <div className="neo-orb neo-orb-1" />
      <div className="neo-orb neo-orb-2" />
      <div className="glow-line" />

      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />

        {/* HERO */}
        <section style={{ paddingTop: 140, paddingBottom: 80, textAlign: "center" }}>
          <div className="container">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <span className="neo-badge">
                <span className="dot" />
                Ferramentas PDF Profissionais
              </span>
            </div>

            <h1 style={{
              fontSize: "clamp(38px, 6.5vw, 76px)",
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: "-0.03em",
              marginBottom: 24,
              color: "var(--text-primary)",
            }}>
              Seus PDFs.{" "}
              <span style={{
                background: "linear-gradient(135deg, var(--neo-green) 0%, #00d4ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                Sob controle.
              </span>
            </h1>

            <p style={{
              fontSize: "clamp(15px, 2.2vw, 19px)",
              color: "var(--text-secondary)",
              maxWidth: 540,
              margin: "0 auto 52px",
              lineHeight: 1.7,
            }}>
              Converta, comprima, mescle, assine e muito mais.
              Rápido, seguro e direto no browser — sem instalar nada.
            </p>

            <div style={{ maxWidth: 680, margin: "0 auto 36px" }}>
              <UploadZone />
            </div>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 32, flexWrap: "wrap",
              color: "var(--text-muted)", fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {["🔒 Encriptado SSL", "⚡ Processamento imediato", "🗑️ Deletado em 1h"].map((i) => (
                <span key={i}>{i}</span>
              ))}
            </div>
          </div>
        </section>

        {/* STATS */}
        <section style={{ paddingBottom: 80 }}>
          <div className="container">
            <div style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-xl)",
              padding: "36px 48px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 32, textAlign: "center",
            }}>
              {[
                { n: "2M+", l: "Arquivos processados" },
                { n: "180", l: "Países atendidos" },
                { n: "4.9★", l: "Avaliação média" },
                { n: "99.9%", l: "Uptime garantido" },
              ].map((s) => (
                <div key={s.l}>
                  <div style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "var(--neo-green)", lineHeight: 1, marginBottom: 6 }}>
                    {s.n}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TOOLS */}
        <section style={{ paddingBottom: 100 }} id="tools">
          <div className="container">
            <div style={{ marginBottom: 48, textAlign: "center" }}>
              <span className="tag tag-purple" style={{ marginBottom: 12, display: "inline-block" }}>
                Ferramentas
              </span>
              <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.02em" }}>
                Tudo que você precisa, num só lugar
              </h2>
            </div>
            <ToolGrid />
          </div>
        </section>

        {/* PRICING */}
        <section style={{ paddingBottom: 100 }} id="precos">
          <div className="container">
            <div style={{ marginBottom: 48, textAlign: "center" }}>
              <span className="tag tag-green" style={{ marginBottom: 12, display: "inline-block" }}>
                Planos
              </span>
              <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12 }}>
                Simples e transparente
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
                Comece grátis. Upgrade quando precisar de mais poder.
              </p>
            </div>
            <Pricing />
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
TSXEOF

echo "✅ page.tsx principal criado"
echo ""
echo "════════════════════════════════"
echo "✅ NeoConvert setup completo!"
echo "Execute: cd ~/neomello/neo-convert && pnpm dev"
echo "════════════════════════════════"
