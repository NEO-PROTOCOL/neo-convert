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
