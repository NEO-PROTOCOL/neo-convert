import type { ReactNode } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

interface ContentSection {
  title: string;
  paragraphs: ReactNode[];
}

interface ContentPageProps {
  eyebrow: string;
  title: string;
  description: string;
  color: string;
  sections: ContentSection[];
  updatedAt?: string;
  cta?: {
    label: string;
    href: string;
  };
}

export default function ContentPage({
  eyebrow,
  title,
  description,
  color,
  sections,
  updatedAt,
  cta,
}: ContentPageProps) {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "100vh", paddingTop: 108, paddingBottom: 80 }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div
            style={{
              marginBottom: 28,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            <Link
              href="/"
              style={{ color: "var(--text-muted)", textDecoration: "none" }}
            >
              NeoConvert
            </Link>
            <span>→</span>
            <span style={{ color: "var(--text-secondary)" }}>{title}</span>
          </div>

          <section
            style={{
              marginBottom: 32,
              padding: "32px",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border-subtle)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                marginBottom: 18,
                padding: "5px 12px",
                borderRadius: "var(--radius-full)",
                background: `${color}18`,
                border: `1px solid ${color}33`,
                color,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {eyebrow}
            </span>

            <h1
              style={{
                fontSize: "clamp(28px, 5vw, 46px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
                marginBottom: 16,
              }}
            >
              {title}
            </h1>

            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 16,
                lineHeight: 1.75,
                maxWidth: 720,
              }}
            >
              {description}
            </p>

            {(updatedAt || cta) && (
              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {updatedAt ? (
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    Atualizado em {updatedAt}
                  </span>
                ) : null}

                {cta ? (
                  <Link href={cta.href} className="btn-secondary">
                    {cta.label}
                  </Link>
                ) : null}
              </div>
            )}
          </section>

          <div style={{ display: "grid", gap: 18 }}>
            {sections.map((section) => (
              <section
                key={section.title}
                style={{
                  padding: "28px 28px 26px",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)",
                }}
              >
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 12,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {section.title}
                </h2>

                <div style={{ display: "grid", gap: 10 }}>
                  {section.paragraphs.map((paragraph, index) => (
                    <p
                      key={`${section.title}-${index}`}
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: 15,
                        lineHeight: 1.75,
                      }}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
