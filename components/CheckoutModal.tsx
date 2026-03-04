"use client";
import { useEffect, useRef, useState } from "react";

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    planId: string;
    planName: string;
    planPrice: string;
}

type Step = "form" | "pix" | "done";

export default function CheckoutModal({
    isOpen,
    onClose,
    planId,
    planName,
    planPrice,
}: CheckoutModalProps) {
    const [step, setStep] = useState<Step>("form");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [pixData, setPixData] = useState<{
        brCode?: string;
        qrCode?: string;
        correlationID?: string;
        expiresAt?: string;
    } | null>(null);
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState(3600);
    const submitAbortRef = useRef<AbortController | null>(null);
    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Countdown do Pix
    useEffect(() => {
        if (step !== "pix") return;
        const interval = setInterval(() => {
            setTimeLeft((t) => {
                if (t <= 1) { clearInterval(interval); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [step]);

    useEffect(() => {
        return () => {
            submitAbortRef.current?.abort();
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        };
    }, []);

    // Fechar com Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const formatTime = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const cleanName = name.trim().replace(/\s+/g, " ");
        const cleanEmail = email.trim().toLowerCase();
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

        if (!cleanName || cleanName.length > 80) {
            setError("Nome inválido.");
            setLoading(false);
            return;
        }
        if (!isValidEmail || cleanEmail.length > 254) {
            setError("Email inválido.");
            setLoading(false);
            return;
        }

        let timeout: ReturnType<typeof setTimeout> | null = null;
        try {
            submitAbortRef.current?.abort();
            const controller = new AbortController();
            submitAbortRef.current = controller;
            timeout = setTimeout(() => controller.abort(), 12000);

            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId, name: cleanName, email: cleanEmail }),
                signal: controller.signal,
            });
            if (timeout) clearTimeout(timeout);
            submitAbortRef.current = null;

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Erro ao criar cobrança. Tente novamente.");
                return;
            }

            setPixData(data);
            setStep("pix");
            if (typeof data.expiresAt === "string") {
                const expiresAt = new Date(data.expiresAt).getTime();
                if (Number.isFinite(expiresAt)) {
                    const seconds = Math.max(Math.floor((expiresAt - Date.now()) / 1000), 0);
                    setTimeLeft(seconds);
                }
            } else {
                setTimeLeft(3600);
            }
        } catch {
            if (submitAbortRef.current?.signal.aborted) {
                setError("Tempo de resposta excedido. Tente novamente.");
            } else {
                setError("Erro de conexão. Verifique sua internet.");
            }
        } finally {
            if (timeout) clearTimeout(timeout);
            setLoading(false);
            submitAbortRef.current = null;
        }
    };

    const copyPix = () => {
        if (!pixData?.brCode) return;
        navigator.clipboard
            .writeText(pixData.brCode)
            .then(() => {
                setCopied(true);
                if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {
                setError("Não foi possível copiar o código Pix.");
            });
    };

    const reset = () => {
        submitAbortRef.current?.abort();
        submitAbortRef.current = null;
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        setStep("form");
        setName("");
        setEmail("");
        setError("");
        setPixData(null);
        setCopied(false);
        setTimeLeft(3600);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(5,5,8,0.85)",
                backdropFilter: "blur(12px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 24,
                animation: "fadeIn 0.2s ease",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-accent)",
                borderRadius: "var(--radius-xl)",
                padding: 40,
                width: "100%", maxWidth: 480,
                boxShadow: "0 40px 80px rgba(0,0,0,0.6), var(--neo-green-glow)",
                animation: "slideUp 0.3s var(--ease-neo)",
                position: "relative",
            }}>
                {/* Fechar */}
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute", top: 20, right: 20,
                        background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)", width: 32, height: 32,
                        cursor: "pointer", color: "var(--text-muted)", fontSize: 18,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >×</button>

                {/* Plano selecionado */}
                <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "var(--neo-green-dim)", border: "1px solid var(--border-accent)",
                    borderRadius: "var(--radius-md)", padding: "12px 16px",
                    marginBottom: 28,
                }}>
                    <span style={{ fontSize: 20 }}>⚡</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--neo-green)" }}>{planName}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{planPrice} · Pix mensal</div>
                    </div>
                </div>

                {/* STEP: Form */}
                {step === "form" && (
                    <form onSubmit={handleSubmit}>
                        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Assinar agora</h2>
                        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 28 }}>
                            Preencha os dados para gerar o QR Code Pix.
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    Seu nome
                                </label>
                                <input
                                    id="checkout-name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="João Silva"
                                    style={{
                                        width: "100%", padding: "12px 16px",
                                        background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                                        borderRadius: "var(--radius-md)", color: "var(--text-primary)",
                                        fontSize: 15, outline: "none", boxSizing: "border-box",
                                        transition: "border-color 200ms",
                                        fontFamily: "inherit",
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = "var(--neo-green)"}
                                    onBlur={(e) => e.target.style.borderColor = "var(--border-default)"}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    E-mail
                                </label>
                                <input
                                    id="checkout-email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="joao@empresa.com"
                                    style={{
                                        width: "100%", padding: "12px 16px",
                                        background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                                        borderRadius: "var(--radius-md)", color: "var(--text-primary)",
                                        fontSize: 15, outline: "none", boxSizing: "border-box",
                                        transition: "border-color 200ms",
                                        fontFamily: "inherit",
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = "var(--neo-green)"}
                                    onBlur={(e) => e.target.style.borderColor = "var(--border-default)"}
                                />
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                marginTop: 16, padding: "12px 16px",
                                background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)",
                                borderRadius: "var(--radius-md)", color: "#ff2d55", fontSize: 13,
                            }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            id="checkout-submit"
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                            style={{ width: "100%", marginTop: 24, justifyContent: "center", opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? (
                                <>
                                    <span style={{
                                        width: 16, height: 16, border: "2px solid rgba(0,0,0,0.3)",
                                        borderTopColor: "#000", borderRadius: "50%",
                                        animation: "spin 0.7s linear infinite",
                                        display: "inline-block",
                                    }} />
                                    Gerando Pix...
                                </>
                            ) : "⚡ Gerar QR Code Pix"}
                        </button>

                        <p style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: "var(--text-muted)" }}>
                            🔒 Pix seguro · sem cartão · cancele quando quiser
                        </p>
                    </form>
                )}

                {/* STEP: Pix */}
                {step === "pix" && pixData && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--neo-green)", marginBottom: 4 }}>
                            ⏱ Expira em {formatTime(timeLeft)}
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Pague com Pix</h2>
                        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
                            Escaneie o QR Code ou copie o código abaixo.
                        </p>

                        {pixData.qrCode && (
                            <div style={{
                                display: "inline-block", padding: 16,
                                background: "#fff", borderRadius: 16, marginBottom: 24,
                            }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`data:image/png;base64,${pixData.qrCode}`}
                                    alt="QR Code Pix"
                                    width={200} height={200}
                                    style={{ display: "block" }}
                                />
                            </div>
                        )}

                        {pixData.brCode && (
                            <>
                                <div style={{
                                    background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                                    borderRadius: "var(--radius-md)", padding: "12px 16px",
                                    fontFamily: "monospace", fontSize: 11,
                                    color: "var(--text-secondary)", wordBreak: "break-all",
                                    textAlign: "left", marginBottom: 12, maxHeight: 80, overflow: "hidden",
                                }}>
                                    {pixData.brCode}
                                </div>
                                <button
                                    onClick={copyPix}
                                    className="btn-primary"
                                    style={{ width: "100%", justifyContent: "center" }}
                                >
                                    {copied ? "✓ Copiado!" : "📋 Copiar Pix Copia e Cola"}
                                </button>
                            </>
                        )}

                        <div style={{
                            marginTop: 20, padding: "12px 16px",
                            background: "var(--neo-green-dim)", border: "1px solid var(--border-accent)",
                            borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--text-secondary)",
                        }}>
                            📧 Enviamos o QR Code para <strong style={{ color: "var(--neo-green)" }}>{email}</strong>
                        </div>

                        <button
                            onClick={reset}
                            style={{
                                marginTop: 16, background: "none", border: "none",
                                color: "var(--text-muted)", fontSize: 13, cursor: "pointer",
                                textDecoration: "underline",
                            }}
                        >
                            Fechar
                        </button>
                    </div>
                )}
            </div>

            <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
        </div>
    );
}
