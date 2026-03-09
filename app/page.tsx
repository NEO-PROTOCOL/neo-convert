"use client";

import Navbar from "@/components/Navbar";
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
        <main id="main-content">
          {/* HERO */}
          <section
            style={{ paddingTop: 140, paddingBottom: 80, textAlign: "center" }}
          >
            <div className="container">
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 24,
                }}
              >
                <span className="neo-badge">
                  <span className="dot" />
                  Ferramentas PDF Profissionais
                </span>
              </div>

              <h1
                style={{
                  fontSize: "clamp(38px, 6.5vw, 76px)",
                  fontWeight: 800,
                  lineHeight: 1.06,
                  letterSpacing: "-0.03em",
                  marginBottom: 24,
                  color: "var(--text-primary)",
                }}
              >
                Seus PDFs.{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(135deg, var(--neo-green) 0%, #00d4ff 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Sob controle.
                </span>
              </h1>

              <p
                style={{
                  fontSize: "clamp(15px, 2.2vw, 19px)",
                  color: "var(--text-secondary)",
                  maxWidth: 540,
                  margin: "0 auto 52px",
                  lineHeight: 1.7,
                }}
              >
                Converta, comprima, mescle, assine e muito mais. Rápido, seguro
                e direto no browser — sem instalar nada.
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                  margin: "0 auto 20px",
                }}
              >
                <a href="#tools" className="btn-primary">
                  Ver ferramentas
                </a>
                <a href="#precos" className="btn-secondary">
                  Ver preços
                </a>
              </div>

              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  maxWidth: 560,
                  margin: "0 auto 36px",
                  lineHeight: 1.7,
                }}
              >
                Escolha primeiro o serviço que deseja usar. O upload acontece
                dentro da ferramenta certa, com fluxo mais claro e menos
                fricção.
              </p>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 36,
                  padding: "10px 14px",
                  borderRadius: "var(--radius-full)",
                  background: "rgba(0,255,157,0.06)",
                  border: "1px solid rgba(0,255,157,0.18)",
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <span style={{ color: "var(--neo-green)" }}>→</span>
                Entrada institucional na home. Execução dentro da ferramenta.
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 32,
                  flexWrap: "wrap",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {[
                  "🔒 Encriptado SSL",
                  "⚡ Processamento imediato",
                  "🗑️ Deletado em 1h",
                ].map((i) => (
                  <span key={i}>{i}</span>
                ))}
              </div>
            </div>
          </section>

          {/* STATS */}
          <section style={{ paddingBottom: 80 }}>
            <div className="container">
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-xl)",
                  padding: "36px 48px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 32,
                  textAlign: "center",
                }}
              >
                {[
                  { n: "2M+", l: "Arquivos processados" },
                  { n: "180", l: "Países atendidos" },
                  { n: "4.9★", l: "Avaliação média" },
                  { n: "99.9%", l: "Uptime garantido" },
                ].map((s) => (
                  <div key={s.l}>
                    <div
                      style={{
                        fontSize: "clamp(28px, 4vw, 44px)",
                        fontWeight: 800,
                        color: "var(--neo-green)",
                        lineHeight: 1,
                        marginBottom: 6,
                      }}
                    >
                      {s.n}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* TOOLS */}
          <section style={{ paddingBottom: 100 }} id="tools">
            <div className="container">
              <div style={{ marginBottom: 48, textAlign: "center" }}>
                <span
                  className="tag tag-purple"
                  style={{ marginBottom: 12, display: "inline-block" }}
                >
                  Ferramentas
                </span>
                <h2
                  style={{
                    fontSize: "clamp(26px, 4vw, 42px)",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
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
                <span
                  className="tag tag-green"
                  style={{ marginBottom: 12, display: "inline-block" }}
                >
                  Planos
                </span>
                <h2
                  style={{
                    fontSize: "clamp(26px, 4vw, 42px)",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    marginBottom: 12,
                  }}
                >
                  Simples e transparente
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
                  Comece grátis. Upgrade quando precisar de mais poder.
                </p>
              </div>
              <Pricing />
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
