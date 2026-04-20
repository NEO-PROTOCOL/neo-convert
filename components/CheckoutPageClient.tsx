"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { formatCpfInput, isValidCpf } from "@/lib/cpf";
import {
  CHECKOUT_PLANS,
  CheckoutPlan,
  CheckoutPlanId,
  getCheckoutPlanById,
} from "@/lib/checkout-plans";

type Step = "form" | "pix" | "done";

interface CheckoutPageClientProps {
  initialPlanId: CheckoutPlanId;
  initialSessionToken?: string | null;
}

export default function CheckoutPageClient({
  initialPlanId,
  initialSessionToken = null,
}: CheckoutPageClientProps) {
  const plan = getCheckoutPlanById(initialPlanId);
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedCharge, setAcceptedCharge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionSummary, setSessionSummary] = useState<{
    returnToPath: string;
    fileNames: string[];
    expiresAt: number;
  } | null>(null);
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

  useEffect(() => {
    if (step !== "pix") return;
    const interval = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          clearInterval(interval);
          return 0;
        }
        return current - 1;
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

  useEffect(() => {
    if (!initialSessionToken) return;

    let active = true;

    fetch(`/api/checkout-session?session=${encodeURIComponent(initialSessionToken)}`, {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data) {
          throw new Error("Nao foi possivel recuperar a sessao de checkout.");
        }
        if (!active) return;
        setSessionSummary({
          returnToPath:
            typeof data.returnToPath === "string" ? data.returnToPath : "/",
          fileNames: Array.isArray(data.files)
            ? data.files
                .map((file: { name?: unknown }) =>
                  typeof file.name === "string" ? file.name : null,
                )
                .filter((name: string | null): name is string => Boolean(name))
            : [],
          expiresAt:
            typeof data.expiresAt === "number" ? data.expiresAt : Date.now(),
        });
      })
      .catch(() => {
        if (!active) return;
        setError("Sessao de checkout invalida ou expirada.");
      });

    return () => {
      active = false;
    };
  }, [initialSessionToken]);

  const formatTime = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const checkPaymentStatus = useCallback(async () => {
    const chargeId = pixData?.correlationID?.trim();
    if (!chargeId) return false;

    const search = new URLSearchParams();
    if (email) search.set("notifyEmail", email);
    if (name) search.set("notifyName", name);
    search.set("planId", plan.id);
    if (plan.price && plan.period) {
      search.set("notifyAmount", `${plan.price} ${plan.period}`);
    }

    setCheckingStatus(true);
    try {
      const query = search.toString();
      const response = await fetch(
        `/api/checkout/status/${encodeURIComponent(chargeId)}${query ? `?${query}` : ""}`,
        { method: "GET", cache: "no-store" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return false;

      const status =
        typeof data.status === "string" ? data.status.toUpperCase() : "CREATED";
      const paid = Boolean(data.paid);
      const paidAtValue = typeof data.paidAt === "string" ? data.paidAt : null;

      setPaymentStatus(status);
      setPaidAt(paidAtValue);

      if (paid) {
        // Download token is issued server-side as an HttpOnly cookie — the
        // browser will carry it automatically to the tool page. We only pass
        // a `paid=1` signal so the tool page knows to resume the download
        // flow. Avoids leaking the token via URL query, server logs,
        // browser history, or Referer headers.
        if (sessionSummary?.returnToPath && initialSessionToken) {
          const redirectUrl = new URL(sessionSummary.returnToPath, window.location.origin);
          redirectUrl.searchParams.set("checkoutSession", initialSessionToken);
          redirectUrl.searchParams.set("paid", "1");
          window.location.assign(redirectUrl.toString());
          return true;
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
  }, [
    email,
    initialSessionToken,
    name,
    pixData?.correlationID,
    plan.id,
    plan.period,
    plan.price,
    sessionSummary?.returnToPath,
  ]);

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
  }, [checkPaymentStatus, pixData?.correlationID, step]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanEmail = email.trim().toLowerCase();
    const cleanCpf = cpf.replace(/\D/g, "");
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

    if (!cleanName || cleanName.length > 80) {
      setError("Nome invalido.");
      setLoading(false);
      return;
    }

    if (!isValidEmail || cleanEmail.length > 254) {
      setError("Email invalido.");
      setLoading(false);
      return;
    }

    if (!isValidCpf(cleanCpf)) {
      setError("CPF invalido.");
      setLoading(false);
      return;
    }

    if (!acceptedTerms || !acceptedCharge) {
      setError(
        "Confirme os termos e as condicoes comerciais antes de gerar a cobranca.",
      );
      setLoading(false);
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;

    try {
      submitAbortRef.current?.abort();
      const controller = new AbortController();
      submitAbortRef.current = controller;
      timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          name: cleanName,
          email: cleanEmail,
          cpf: cleanCpf,
        }),
        signal: controller.signal,
      });

      if (timeout) clearTimeout(timeout);
      submitAbortRef.current = null;

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao criar cobranca. Tente novamente.");
        return;
      }

      setPixData(data);
      setPaymentStatus("CREATED");
      setPaidAt(null);
      setStep("pix");

      if (typeof data.expiresAt === "string") {
        const expiresAtTs = new Date(data.expiresAt).getTime();
        if (Number.isFinite(expiresAtTs)) {
          setTimeLeft(
            Math.max(Math.floor((expiresAtTs - Date.now()) / 1000), 0),
          );
        }
      } else {
        setTimeLeft(3600);
      }
    } catch {
      if (submitAbortRef.current?.signal.aborted) {
        setError("Tempo de resposta excedido. Tente novamente.");
      } else {
        setError("Erro de conexao. Verifique sua internet.");
      }
    } finally {
      if (timeout) clearTimeout(timeout);
      submitAbortRef.current = null;
      setLoading(false);
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
        setError("Nao foi possivel copiar o codigo Pix.");
      });
  };

  return (
    <section style={{ paddingTop: 140, paddingBottom: 96 }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span className="tag tag-green" style={{ display: "inline-block" }}>
            Checkout Seguro
          </span>
          <h1
            style={{
              marginTop: 16,
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            Pagamento com contexto, nao com opacidade.
          </h1>
          <p
            style={{
              maxWidth: 760,
              margin: "16px auto 0",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              fontSize: 15,
            }}
          >
            Esta pagina explicita preco, modelo comercial, entrega operacional e
            links legais antes da geracao da cobranca Pix. E assim que destino
            comercial deve se comportar.
          </p>
          {sessionSummary ? (
            <p
              style={{
                maxWidth: 760,
                margin: "14px auto 0",
                color: "var(--neo-green)",
                lineHeight: 1.7,
                fontSize: 13,
              }}
            >
              Voce esta liberando {sessionSummary.fileNames.length} arquivo
              {sessionSummary.fileNames.length === 1 ? "" : "s"} processado
              {sessionSummary.fileNames.length === 1 ? "" : "s"} em{" "}
              <strong>{sessionSummary.returnToPath}</strong>.
            </p>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
            gap: 28,
            alignItems: "start",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 20,
            }}
          >
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-accent)",
                borderRadius: "var(--radius-xl)",
                padding: 28,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  marginBottom: 20,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-muted)",
                      marginBottom: 10,
                    }}
                  >
                    Plano selecionado
                  </div>
                  <h2 style={{ fontSize: 28, fontWeight: 800 }}>
                    {plan.checkoutName}
                  </h2>
                  <p
                    style={{
                      marginTop: 8,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    {plan.description}
                  </p>
                </div>
                <div
                  style={{
                    minWidth: 180,
                    padding: "14px 16px",
                    borderRadius: "var(--radius-lg)",
                    background: "rgba(0,255,157,0.08)",
                    border: "1px solid rgba(0,255,157,0.24)",
                    textAlign: "right",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Valor exibido
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 32,
                      fontWeight: 800,
                      color: "var(--neo-green)",
                    }}
                  >
                    {plan.price}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                    {plan.period}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                <PolicyBlock
                  title="Cobranca"
                  body={plan.billingModel}
                  color="rgba(0,255,157,0.12)"
                />
                <PolicyBlock
                  title="Entrega"
                  body={plan.deliveryWindow}
                  color="rgba(255,255,255,0.04)"
                />
                <PolicyBlock
                  title="Suporte"
                  body={plan.supportModel}
                  color="rgba(255,255,255,0.04)"
                />
                <PolicyBlock
                  title="Contato"
                  body="Operacao comercial via neo@neoprotocol.space. Use este canal para cobranca, suporte e solicitacoes comerciais."
                  color="rgba(255,255,255,0.04)"
                />
                {sessionSummary ? (
                  <PolicyBlock
                    title="Arquivos aguardando liberacao"
                    body={sessionSummary.fileNames.join(", ")}
                    color="rgba(255,255,255,0.04)"
                  />
                ) : null}
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-xl)",
                padding: 28,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 20,
                }}
              >
                <h3 style={{ fontSize: 20, fontWeight: 800 }}>
                  Compare os planos
                </h3>
                <Link
                  href="/#precos"
                  style={{
                    color: "var(--neo-green)",
                    textDecoration: "none",
                    fontSize: 13,
                  }}
                >
                  Voltar para precos
                </Link>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                {CHECKOUT_PLANS.map((candidate) => (
                  <PlanSwitchCard
                    key={candidate.id}
                    candidate={candidate}
                    active={candidate.id === plan.id}
                    sessionToken={initialSessionToken ?? undefined}
                  />
                ))}
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-xl)",
                padding: 28,
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
                Informacoes legais visiveis antes da compra
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                <LegalLinkCard
                  title="Termos de uso"
                  href="/termos"
                  description="Regras de uso, limites operacionais, pagamentos e contato institucional."
                />
                <LegalLinkCard
                  title="Privacidade"
                  href="/privacidade"
                  description="Dados tratados, finalidade operacional e limites de compartilhamento."
                />
                <LegalLinkCard
                  title="Cookies"
                  href="/cookies"
                  description="Persistencia local, consentimento e medicao opcional."
                />
                <LegalLinkCard
                  title="Contato"
                  href="/contato"
                  description="Canal para suporte, comercial, cancelamento e analise de casos."
                />
              </div>
            </div>
          </div>

          <div
            style={{
              position: "sticky",
              top: 108,
            }}
          >
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-accent)",
                borderRadius: "var(--radius-xl)",
                padding: 32,
                boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-muted)",
                    }}
                  >
                    Cobrança Pix
                  </div>
                  <h2 style={{ marginTop: 8, fontSize: 24, fontWeight: 800 }}>
                    {plan.checkoutName}
                  </h2>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: "var(--neo-green)",
                    }}
                  >
                    {plan.price}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                    {plan.period}
                  </div>
                </div>
              </div>

              {step === "form" && (
                <CheckoutPageForm
                  name={name}
                  email={email}
                  cpf={cpf}
                  loading={loading}
                  error={error}
                  acceptedTerms={acceptedTerms}
                  acceptedCharge={acceptedCharge}
                  setName={setName}
                  setEmail={setEmail}
                  setCpf={setCpf}
                  setAcceptedTerms={setAcceptedTerms}
                  setAcceptedCharge={setAcceptedCharge}
                  onSubmit={handleSubmit}
                  plan={plan}
                  hasPendingSession={Boolean(sessionSummary)}
                />
              )}

              {step === "pix" && pixData && (
                <PixStep
                  pixData={pixData}
                  timeLeft={timeLeft}
                  copied={copied}
                  formatTime={formatTime}
                  copyPix={copyPix}
                  checkingStatus={checkingStatus}
                  checkPaymentStatus={checkPaymentStatus}
                />
              )}

              {step === "done" && (
                <DoneStep
                  email={email}
                  paymentStatus={paymentStatus}
                  paidAt={paidAt}
                  correlationID={pixData?.correlationID || ""}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PolicyBlock({
  title,
  body,
  color,
}: {
  title: string;
  body: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: "var(--radius-lg)",
        background: color,
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>
        {body}
      </p>
    </div>
  );
}

function LegalLinkCard({
  title,
  href,
  description,
}: {
  title: string;
  href: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        padding: 16,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div
        style={{
          color: "var(--text-primary)",
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
        {description}
      </p>
    </Link>
  );
}

function PlanSwitchCard({
  candidate,
  active,
  sessionToken,
}: {
  candidate: CheckoutPlan;
  active: boolean;
  sessionToken?: string;
}) {
  return (
    <Link
      href={
        sessionToken
          ? `/checkout?plan=${candidate.id}&session=${encodeURIComponent(sessionToken)}`
          : `/checkout?plan=${candidate.id}`
      }
      style={{
        textDecoration: "none",
        padding: 16,
        borderRadius: "var(--radius-lg)",
        border: active
          ? "1px solid var(--border-accent)"
          : "1px solid var(--border-subtle)",
        background: active ? "rgba(0,255,157,0.08)" : "rgba(255,255,255,0.02)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: active ? "var(--neo-green)" : "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
        }}
      >
        {active ? "Selecionado" : "Trocar plano"}
      </div>
      <div style={{ color: "var(--text-primary)", fontWeight: 800 }}>
        {candidate.checkoutName}
      </div>
      <div style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: 13 }}>
        {candidate.price} {candidate.period}
      </div>
    </Link>
  );
}

interface CheckoutPageFormProps {
  name: string;
  email: string;
  cpf: string;
  loading: boolean;
  error: string;
  acceptedTerms: boolean;
  acceptedCharge: boolean;
  setName: (value: string) => void;
  setEmail: (value: string) => void;
  setCpf: (value: string) => void;
  setAcceptedTerms: (value: boolean) => void;
  setAcceptedCharge: (value: boolean) => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
  plan: CheckoutPlan;
  hasPendingSession: boolean;
}

const CheckoutPageForm = memo(
  ({
    name,
    email,
    cpf,
    loading,
    error,
    acceptedTerms,
    acceptedCharge,
    setName,
    setEmail,
    setCpf,
    setAcceptedTerms,
    setAcceptedCharge,
    onSubmit,
    plan,
    hasPendingSession,
  }: CheckoutPageFormProps) => (
    <form onSubmit={onSubmit}>
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: 14,
          lineHeight: 1.7,
          marginBottom: 24,
        }}
      >
        Informe os dados do responsavel pela compra. O email sera usado para
        comprovacao, suporte e comunicacoes operacionais relacionadas a esta
        cobranca. O CPF e exigido para a FlowPay gerar o QR Code Pix.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={{ display: "block" }}>
          <span
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            Nome do responsavel
          </span>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Joao Silva"
            style={inputStyle}
          />
        </label>

        <label style={{ display: "block" }}>
          <span
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="joao@empresa.com"
            style={inputStyle}
          />
        </label>

        <label style={{ display: "block" }}>
          <span
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            CPF
          </span>
          <input
            type="text"
            required
            inputMode="numeric"
            autoComplete="off"
            value={cpf}
            onChange={(event) => setCpf(formatCpfInput(event.target.value))}
            placeholder="000.000.000-00"
            style={inputStyle}
          />
        </label>
      </div>

      <div
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}
        >
          Resumo desta cobranca
        </div>
        <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>
          {plan.checkoutName}
        </div>
        <p
          style={{
            marginTop: 8,
            color: "var(--text-secondary)",
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          {plan.price} {plan.period}. {plan.billingModel}{" "}
          {hasPendingSession
            ? "O arquivo processado sera liberado apos confirmacao do Pix."
            : ""}
        </p>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <ConsentRow
          checked={acceptedTerms}
          onChange={(value) => setAcceptedTerms(value)}
        >
          Li e concordo com os <Link href="/termos">Termos de Uso</Link> e a{" "}
          <Link href="/privacidade">Politica de Privacidade</Link>.
        </ConsentRow>
        <ConsentRow
          checked={acceptedCharge}
          onChange={(value) => setAcceptedCharge(value)}
        >
          Entendo o preco exibido, a forma de cobranca deste plano e o canal de
          suporte comercial em{" "}
          <a href="mailto:neo@neoprotocol.space">neo@neoprotocol.space</a>.
        </ConsentRow>
      </div>

      {error && (
        <div style={{ marginTop: 16, color: "#ff6b6b", fontSize: 13 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary"
        style={{
          width: "100%",
          marginTop: 24,
          justifyContent: "center",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Gerando cobranca..." : "Gerar Pix com este plano"}
      </button>
    </form>
  ),
);
CheckoutPageForm.displayName = "CheckoutPageForm";

function ConsentRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "18px minmax(0, 1fr)",
        gap: 10,
        alignItems: "flex-start",
        color: "var(--text-secondary)",
        fontSize: 13,
        lineHeight: 1.7,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={{ marginTop: 3 }}
      />
      <span>{children}</span>
    </label>
  );
}

const PixStep = memo(
  ({
    pixData,
    timeLeft,
    copied,
    formatTime,
    copyPix,
    checkingStatus,
    checkPaymentStatus,
  }: {
    pixData: {
      brCode?: string;
      qrCode?: string;
      correlationID?: string;
    };
    timeLeft: number;
    copied: boolean;
    formatTime: (seconds: number) => string;
    copyPix: () => void;
    checkingStatus: boolean;
    checkPaymentStatus: () => Promise<boolean>;
  }) => (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 12,
          fontFamily: "monospace",
          color: "var(--neo-green)",
          marginBottom: 4,
        }}
      >
        Expira em {formatTime(timeLeft)}
      </div>
      <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
        Pague com Pix
      </h3>
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: 14,
          marginBottom: 24,
          lineHeight: 1.7,
        }}
      >
        Escaneie o QR Code ou use o codigo copia e cola abaixo. A liberacao
        comercial acontece apos confirmacao do pagamento.
      </p>

      {pixData.qrCode && (
        <div
          style={{
            display: "inline-block",
            padding: 16,
            background: "#fff",
            borderRadius: 16,
            marginBottom: 24,
          }}
        >
          <Image
            src={
              pixData.qrCode.startsWith("http") ||
              pixData.qrCode.startsWith("data:")
                ? pixData.qrCode
                : `data:image/png;base64,${pixData.qrCode}`
            }
            alt="QR Code Pix"
            width={220}
            height={220}
            unoptimized
          />
        </div>
      )}

      {pixData.brCode && (
        <>
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "12px 16px",
              fontFamily: "monospace",
              fontSize: 11,
              color: "var(--text-secondary)",
              wordBreak: "break-all",
              textAlign: "left",
              marginBottom: 12,
              maxHeight: 96,
              overflow: "hidden",
            }}
          >
            {pixData.brCode}
          </div>

          <button
            onClick={copyPix}
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {copied ? "Codigo copiado" : "Copiar codigo Pix"}
          </button>

          <button
            onClick={() => {
              checkPaymentStatus();
            }}
            disabled={checkingStatus}
            className="btn-secondary"
            style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
          >
            {checkingStatus ? "Verificando..." : "Ja paguei, verificar agora"}
          </button>
        </>
      )}
    </div>
  ),
);
PixStep.displayName = "PixStep";

const DoneStep = memo(
  ({
    email,
    paymentStatus,
    paidAt,
    correlationID,
  }: {
    email: string;
    paymentStatus: string;
    paidAt: string | null;
    correlationID: string;
  }) => (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          margin: "0 auto 16px",
          display: "grid",
          placeItems: "center",
          background: "rgba(0,255,157,0.12)",
          border: "1px solid rgba(0,255,157,0.28)",
          color: "var(--neo-green)",
          fontWeight: 800,
        }}
      >
        OK
      </div>
      <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
        Pagamento confirmado
      </h3>
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: 14,
          lineHeight: 1.7,
          marginBottom: 20,
        }}
      >
        Confirmacao vinculada a <strong>{email}</strong>. Guarde este email para
        suporte e continuidade operacional.
      </p>
      <div
        style={{
          textAlign: "left",
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-md)",
          padding: 14,
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        <div>ID: {correlationID}</div>
        <div>Status: {paymentStatus}</div>
        {paidAt && <div>Data: {new Date(paidAt).toLocaleString()}</div>}
      </div>
      <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
        <Link href="/#tools" className="btn-primary" style={{ justifyContent: "center" }}>
          Ir para as ferramentas
        </Link>
        <Link
          href="/contato"
          className="btn-secondary"
          style={{ justifyContent: "center" }}
        >
          Preciso de suporte
        </Link>
      </div>
    </div>
  ),
);
DoneStep.displayName = "DoneStep";

const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
};
