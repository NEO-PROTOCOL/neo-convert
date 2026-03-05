"use client";
import Link from "next/link";

export default function Footer() {
  const TOOL_LINKS = [
    { label: "Comprimir PDF", href: "/tools/compress-pdf" },
    { label: "Mesclar PDF", href: "/tools/merge-pdf" },
    { label: "Dividir PDF", href: "/tools/split-pdf" },
    { label: "Assinar PDF", href: "/tools/sign-pdf" },
    { label: "PDF para Word", href: "/tools/pdf-to-word" },
  ];

  const COMPANY_LINKS = [
    { label: "Sobre nós", href: "/sobre" },
    { label: "Blog", href: "/blog" },
    { label: "Preços", href: "/#precos" },
    { label: "Contato", href: "/contato" },
  ];

  const LEGAL_LINKS = [
    { label: "Privacidade", href: "/privacidade" },
    { label: "Termos", href: "/termos" },
    { label: "Cookies", href: "/cookies" },
    { label: "Segurança", href: "/seguranca" },
  ];

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
            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, maxWidth: 260 }}>
              Ferramentas PDF premium para profissionais que valorizam velocidade e segurança.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Ferramentas
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {TOOL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} style={{ color: "var(--text-secondary)", fontSize: 13, textDecoration: "none", transition: "color 150ms" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Empresa
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} style={{ color: "var(--text-secondary)", fontSize: 13, textDecoration: "none", transition: "color 150ms" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Legal
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} style={{ color: "var(--text-secondary)", fontSize: 13, textDecoration: "none", transition: "color 150ms" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: 24,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            © 2026 NeoConvert. Todos os direitos reservados.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
              built_with 💚
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
