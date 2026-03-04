"use client";
import Link from "next/link";

interface ComingSoonProps {
    icon: string;
    title: string;
    description: string;
    color: string;
    availableIn?: string;
}

export default function ComingSoon({ icon, title, description, color, availableIn = "Sprint 2" }: ComingSoonProps) {
    return (
        <div style={{ minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
            <div className="container" style={{ maxWidth: 600, textAlign: "center" }}>

                <div style={{ marginBottom: 32, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
                    <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>NeoConvert</Link>
                    <span>→</span>
                    <span style={{ color: "var(--text-secondary)" }}>{title}</span>
                </div>

                <div style={{
                    width: 100, height: 100, borderRadius: 28,
                    background: `${color}18`, border: `1px solid ${color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 44, margin: "0 auto 32px",
                    boxShadow: `0 0 40px ${color}20`,
                }}>{icon}</div>

                <span style={{
                    display: "inline-block", marginBottom: 20,
                    padding: "4px 14px", borderRadius: 999,
                    background: "rgba(123, 47, 255, 0.15)", border: "1px solid rgba(123, 47, 255, 0.3)",
                    color: "#7b2fff", fontSize: 11, fontWeight: 700,
                    fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase",
                }}>Em desenvolvimento · {availableIn}</span>

                <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16 }}>
                    {title}
                </h1>

                <p style={{ color: "var(--text-secondary)", fontSize: 16, lineHeight: 1.7, marginBottom: 40, maxWidth: 440, margin: "0 auto 40px" }}>
                    {description}
                </p>

                <div style={{
                    background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-xl)", padding: "32px",
                    marginBottom: 32,
                }}>
                    <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
                        🔔 Quer ser notificado quando ficar pronto?
                    </p>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const emailInput = form.querySelector("input[type=email]") as HTMLInputElement;
                            alert(`Anotado! Avisaremos ${emailInput.value} quando ${title} estiver disponível.`);
                            emailInput.value = "";
                        }}
                        style={{ display: "flex", gap: 10 }}
                    >
                        <input
                            id="notify-email"
                            type="email"
                            required
                            placeholder="seu@email.com"
                            style={{
                                flex: 1, padding: "11px 16px",
                                background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                                borderRadius: "var(--radius-md)", color: "var(--text-primary)",
                                fontSize: 14, outline: "none", fontFamily: "inherit",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "var(--neo-green)")}
                            onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
                        />
                        <button type="submit" className="btn-primary">Avisar</button>
                    </form>
                </div>

                <Link href="/#tools" className="btn-secondary" style={{ justifyContent: "center" }}>
                    ← Ver ferramentas disponíveis
                </Link>

            </div>
        </div>
    );
}
