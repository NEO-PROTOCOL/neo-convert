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
