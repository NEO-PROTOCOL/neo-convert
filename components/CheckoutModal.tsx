"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    planId: string;
    planName: string;
    planPrice: string;
    onPaid?: (data: {
        planId: string;
        email: string;
        correlationID?: string;
    }) => void;
}

type Step = "form" | "pix" | "done";

export default function CheckoutModal({
    isOpen,
    onClose,
    planId,
    planName,
    planPrice,
    onPaid,
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
    const [paymentStatus, setPaymentStatus] = useState("CREATED");
    const [paidAt, setPaidAt] = useState<string | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const submitAbortRef = useRef<AbortController | null>(null);
    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const paidNotifiedRef = useRef<string | null>(null);

    // Countdown do Pix
    useEffect(() => {
        if (step !== "pix") return;
        const interval = setInterval(() => {
            setTimeLeft((t) => {
                if (t <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [step]);

    useEffect(() => {
        const currentSubmitAbort = submitAbortRef.current;
        const currentCopyTimeout = copyTimeoutRef.current;
        return () => {
            currentSubmitAbort?.abort();
            if (currentCopyTimeout) clearTimeout(currentCopyTimeout);
        };
    }, []);

    // Fechar com Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const formatTime = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    const checkPaymentStatus = useCallback(async () => {
        const chargeId = pixData?.correlationID?.trim();
        if (!chargeId) return false;

        const search = new URLSearchParams();
        if (email) search.set("notifyEmail", email);
        if (name) search.set("notifyName", name);
        if (planPrice) search.set("notifyAmount", planPrice);
        const query = search.toString();

        setCheckingStatus(true);
        try {
            const res = await fetch(
                `/api/checkout/status/${encodeURIComponent(chargeId)}${query ? `?${query}` : ""}`,
                {
                    method: "GET",
                    cache: "no-store",
                },
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return false;

            const status = typeof data.status === "string" ? data.status.toUpperCase() : "CREATED";
            const paid = Boolean(data.paid);
            const paidAtValue = typeof data.paidAt === "string" ? data.paidAt : null;

            setPaymentStatus(status);
            setPaidAt(paidAtValue);

            if (paid) {
                const correlationID = pixData?.correlationID;
                if (paidNotifiedRef.current !== correlationID) {
                    onPaid?.({ planId, email, correlationID });
                    paidNotifiedRef.current = correlationID ?? "__paid_without_id__";
                }
                setStep("done");
                return true;
            }
            return false;
        } catch {
            return false;
        } finally {
            setCheckingStatus(false);
        }
    }, [pixData?.correlationID, onPaid, planId, email, name, planPrice]);

    useEffect(() => {
        if (step !== "pix" || !pixData?.correlationID) return;

        let active = true;
        let interval: ReturnType<typeof setInterval> | null = null;

        const poll = async () => {
            if (!active) return;
            const paid = await checkPaymentStatus();
            if (paid && interval) {
                clearInterval(interval);
                interval = null;
            }
        };

        poll();
        interval = setInterval(poll, 8000);

        return () => {
            active = false;
            if (interval) clearInterval(interval);
        };
    }, [step, pixData?.correlationID, checkPaymentStatus]);

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
            setPaymentStatus("CREATED");
            setPaidAt(null);
            setStep("pix");
            if (typeof data.expiresAt === "string") {
                const expiresAtTS = new Date(data.expiresAt).getTime();
                if (Number.isFinite(expiresAtTS)) {
                    const seconds = Math.max(Math.floor((expiresAtTS - Date.now()) / 1000), 0);
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
                const currentCopyTimeout = copyTimeoutRef.current;
                if (currentCopyTimeout) clearTimeout(currentCopyTimeout);
                copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {
                setError("Não foi possível copiar o código Pix.");
            });
    };

    const reset = () => {
        submitAbortRef.current?.abort();
        submitAbortRef.current = null;
        const currentCopyTimeout = copyTimeoutRef.current;
        if (currentCopyTimeout) clearTimeout(currentCopyTimeout);
        setStep("form");
        setName("");
        setEmail("");
        setError("");
        setPixData(null);
        setCopied(false);
        setPaymentStatus("CREATED");
        setPaidAt(null);
        setCheckingStatus(false);
        setTimeLeft(3600);
        paidNotifiedRef.current = null;
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(5,5,8,0.95)",
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

                <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "var(--neo-green-dim)", border: "1px solid var(--border-accent)",
                    borderRadius: "var(--radius-md)", padding: "12px 16px",
                    marginBottom: 28,
                }}>
                    <span style={{ fontSize: 20 }}>⚡</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--neo-green)" }}>{planName}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{planPrice} · Pix</div>
                    </div>
                </div>

                {step === "form" && (
                    <CheckoutForm
                        name={name}
                        setName={setName}
                        email={email}
                        setEmail={setEmail}
                        loading={loading}
                        error={error}
                        onSubmit={handleSubmit}
                    />
                )}

                {step === "pix" && pixData && (
                    <PixStep
                        pixData={pixData}
                        timeLeft={timeLeft}
                        formatTime={formatTime}
                        email={email}
                        copied={copied}
                        copyPix={copyPix}
                        paymentStatus={paymentStatus}
                        checkingStatus={checkingStatus}
                        checkPaymentStatus={checkPaymentStatus}
                        reset={reset}
                    />
                )}

                {step === "done" && (
                    <DoneStep
                        email={email}
                        paymentStatus={paymentStatus}
                        paidAt={paidAt}
                        correlationID={pixData?.correlationID || ""}
                        reset={reset}
                    />
                )}
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
                @keyframes slideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
            `}</style>
        </div>
    );
}

interface CheckoutFormProps {
    name: string;
    setName: (val: string) => void;
    email: string;
    setEmail: (val: string) => void;
    loading: boolean;
    error: string;
    onSubmit: (e: React.FormEvent) => Promise<void>;
}

const CheckoutForm = memo(({ name, setName, email, setEmail, loading, error, onSubmit }: CheckoutFormProps) => (
    <form onSubmit={onSubmit}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Gerar cobrança</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 28 }}>
            Preencha os dados para gerar o QR Code Pix.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Seu nome
                </label>
                <input
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
                        fontFamily: "inherit",
                    }}
                />
            </div>

            <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    E-mail
                </label>
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="joao@exemplo.com"
                    style={{
                        width: "100%", padding: "12px 16px",
                        background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)", color: "var(--text-primary)",
                        fontSize: 15, outline: "none", boxSizing: "border-box",
                        fontFamily: "inherit",
                    }}
                />
            </div>
        </div>

        {error && (
            <div style={{ marginTop: 16, color: "#ff2d55", fontSize: 13 }}>
                ⚠️ {error}
            </div>
        )}

        <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", marginTop: 24, justifyContent: "center", opacity: loading ? 0.7 : 1 }}
        >
            {loading ? "Gerando..." : "⚡ Gerar QR Code Pix"}
        </button>
    </form>
));
CheckoutForm.displayName = "CheckoutForm";

interface PixStepProps {
    pixData: {
        brCode?: string;
        qrCode?: string;
        correlationID?: string;
        expiresAt?: string;
    };
    timeLeft: number;
    formatTime: (s: number) => string;
    email: string;
    copied: boolean;
    copyPix: () => void;
    paymentStatus: string;
    checkingStatus: boolean;
    checkPaymentStatus: () => Promise<boolean>;
    reset: () => void;
}

const PixStep = memo(({ pixData, timeLeft, formatTime, email, copied, copyPix, checkingStatus, checkPaymentStatus, reset }: PixStepProps) => (
    <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--neo-green)", marginBottom: 4 }}>
            ⏱ Expira em {formatTime(timeLeft)}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Pague com Pix</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
            Escaneie o QR Code ou copie o código abaixo.
        </p>

        {pixData.qrCode && (
            <div style={{ display: "inline-block", padding: 16, background: "#fff", borderRadius: 16, marginBottom: 24 }}>
                <Image
                    src={pixData.qrCode.startsWith("http") || pixData.qrCode.startsWith("data:") ? pixData.qrCode : `data:image/png;base64,${pixData.qrCode}`}
                    alt="QR Code Pix"
                    width={200}
                    height={200}
                    unoptimized
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
                <button onClick={copyPix} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                    {copied ? "✓ Copiado!" : "📋 Copiar Código Pix"}
                </button>
                <button
                    onClick={() => { checkPaymentStatus(); }}
                    disabled={checkingStatus}
                    style={{
                        width: "100%", marginTop: 10, background: "var(--bg-elevated)",
                        border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)", fontSize: 13, padding: "10px", cursor: "pointer"
                    }}
                >
                    {checkingStatus ? "Verificando..." : "Já paguei · Verificar agora"}
                </button>
            </>
        )}

        <button onClick={reset} style={{ marginTop: 16, background: "none", border: "none", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
            Cancelar e Voltar
        </button>
    </div>
));
PixStep.displayName = "PixStep";

const DoneStep = memo(({ email, paymentStatus, paidAt, correlationID, reset }: any) => (
    <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Pago com sucesso!</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
            Sua licença foi ativada para <strong>{email}</strong>.
        </p>
        <div style={{ textAlign: "left", background: "var(--bg-elevated)", padding: 12, borderRadius: 8, fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
            <div>ID: {correlationID}</div>
            <div>Status: {paymentStatus}</div>
            {paidAt && <div>Data: {new Date(paidAt).toLocaleString()}</div>}
        </div>
        <button onClick={reset} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Concluir
        </button>
    </div>
));
DoneStep.displayName = "DoneStep";
