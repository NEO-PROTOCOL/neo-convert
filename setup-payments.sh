#!/bin/bash
# NeoConvert — Payment Setup Script
# bash ~/neomello/neo-convert/setup-payments.sh

PROJECT="$HOME/neomello/neo-convert"
cd "$PROJECT"

echo "💳 NeoConvert — Configurando Pagamentos FlowPay + Pix..."

# ═══ INSTALAR DEPS ═══
pnpm add resend

# ═══ .env.local ═══
cat > .env.local << 'ENVEOF'
# FlowPay / Woovi Pix
WOOVI_API_KEY=sua_chave_aqui
WOOVI_API_URL=https://api.woovi.com

# Resend Email
RESEND_API_KEY=sua_chave_aqui
RESEND_FROM=NeoConvert <no-reply@neo-convert.com>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENVEOF

echo "✅ .env.local criado (preencher as chaves)"

# ═══ API: CREATE PIX CHARGE ═══
mkdir -p app/api/checkout
cat > app/api/checkout/route.ts << 'TSXEOF'
import { NextRequest, NextResponse } from "next/server";

const PLANS = {
  starter: { name: "NeoConvert Starter", price: 750, label: "R$ 7,50/mês" },
  pro:     { name: "NeoConvert Pro",     price: 2900, label: "R$ 29/mês" },
  business:{ name: "NeoConvert Business",price: 7900, label: "R$ 79/mês" },
} as const;

type PlanKey = keyof typeof PLANS;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, email, name } = body as { plan: string; email: string; name: string };

    if (!plan || !email || !name) {
      return NextResponse.json({ error: "Campos obrigatórios: plan, email, name" }, { status: 400 });
    }

    const selected = PLANS[plan as PlanKey];
    if (!selected) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }

    const wooviKey = process.env.WOOVI_API_KEY;
    const wooviUrl = (process.env.WOOVI_API_URL || "https://api.woovi.com").replace(/\/$/, "");

    if (!wooviKey) {
      return NextResponse.json({ error: "WOOVI_API_KEY não configurada" }, { status: 500 });
    }

    const correlationId = `neoconvert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const expiresIn = 3600; // 1 hora

    // Criar cobrança Pix via Woovi (mesma API que FlowPay usa)
    const charge = await fetch(`${wooviUrl}/api/v1/charge`, {
      method: "POST",
      headers: {
        Authorization: wooviKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        correlationID: correlationId,
        value: selected.price,
        comment: selected.name,
        identifier: correlationId,
        expiresIn,
        customer: { name, email },
        additionalInfo: [{ key: "Plano", value: selected.name }],
      }),
    });

    const chargeData = await charge.json() as any;

    if (!charge.ok) {
      console.error("[checkout] Woovi error:", chargeData);
      return NextResponse.json({ error: chargeData?.error?.message || "Erro ao criar cobrança Pix" }, { status: 502 });
    }

    const pixData = chargeData.charge || chargeData;

    // Enviar email de confirmação via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "NeoConvert <no-reply@neo-convert.com>",
          to: [email],
          subject: `Sua cobrança NeoConvert ${selected.name} foi gerada`,
          html: `
            <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0f;color:#e8e8f0;border-radius:16px;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
                <div style="width:32px;height:32px;background:#00ff9d;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#000;font-size:14px;">N</div>
                <span style="font-size:18px;font-weight:800;">Neo<span style="color:#00ff9d;">Convert</span></span>
              </div>

              <h2 style="font-size:22px;margin:0 0 8px;color:#e8e8f0;">Olá, ${name}! 👋</h2>
              <p style="color:rgba(232,232,240,0.6);margin:0 0 24px;line-height:1.6;">
                Sua cobrança Pix foi gerada com sucesso. Escaneie o QR Code abaixo para ativar o plano <strong style="color:#00ff9d;">${selected.name}</strong>.
              </p>

              <div style="background:#13131a;border:1px solid rgba(0,255,157,0.2);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
                <p style="font-size:13px;color:rgba(232,232,240,0.5);margin:0 0 6px;font-family:monospace;">Valor</p>
                <p style="font-size:32px;font-weight:800;color:#00ff9d;margin:0;">${selected.label}</p>
              </div>

              ${pixData.brCode ? `
              <div style="background:#13131a;border:1px solid rgba(0,255,157,0.2);border-radius:12px;padding:16px;margin-bottom:20px;">
                <p style="font-size:12px;color:rgba(232,232,240,0.5);margin:0 0 8px;font-family:monospace;text-transform:uppercase;letter-spacing:0.05em;">Pix Copia e Cola</p>
                <code style="font-size:11px;color:#00ff9d;word-break:break-all;line-height:1.6;">${pixData.brCode}</code>
              </div>
              ` : ""}

              <p style="font-size:12px;color:rgba(232,232,240,0.4);text-align:center;margin:0;">
                ⏱️ Cobrança válida por 1 hora · ID: ${correlationId}
              </p>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({
      ok: true,
      correlationId,
      plan: selected.name,
      amount: selected.price,
      pix: {
        qrCodeImage: pixData.pixQrCode?.encodedImage || pixData.qrCodeImage || null,
        brCode: pixData.brCode || pixData.pixQrCode?.payload || null,
        expiresAt: pixData.expiresAt || null,
        chargeId: pixData.correlationID || correlationId,
      },
    });

  } catch (err) {
    console.error("[checkout] Unexpected error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
TSXEOF

echo "✅ API /api/checkout criada"

# ═══ COMPONENTE PRICING ATUALIZADO ═══
cat > components/Pricing.tsx << 'TSXEOF'
"use client";
import { useState } from "react";
import CheckoutModal from "./CheckoutModal";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "R$ 7,50",
    period: "/mês",
    desc: "Para uso pessoal e casual",
    features: [
      "20 arquivos por dia",
      "Até 10 MB por arquivo",
      "Compressão e conversão básica",
      "PDF para Word, Word para PDF",
    ],
    cta: "Assinar com Pix",
    featured: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 29",
    period: "/mês",
    desc: "Para profissionais e freelas",
    badge: "Mais popular",
    features: [
      "Arquivos ilimitados",
      "Até 100 MB por arquivo",
      "Todas as ferramentas PDF",
      "Assinatura eletrônica",
      "Histórico de 30 dias",
      "Suporte prioritário",
    ],
    cta: "Assinar com Pix",
    featured: true,
  },
  {
    id: "business",
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
      "SLA 99.9% garantido",
    ],
    cta: "Assinar com Pix",
    featured: false,
  },
];

export default function Pricing() {
  const [modal, setModal] = useState<{ open: boolean; plan: string; planName: string; price: string } | null>(null);

  return (
    <>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 24, alignItems: "start",
      }}>
        {PLANS.map((plan) => (
          <div key={plan.id} className={`pricing-card ${plan.featured ? "featured" : ""}`}
            style={{ position: "relative" }}>

            {plan.badge && (
              <div style={{
                position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                padding: "4px 16px", borderRadius: "var(--radius-full)",
                background: "var(--neo-green)", color: "#000",
                fontSize: 11, fontWeight: 800, whiteSpace: "nowrap",
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em",
              }}>{plan.badge}</div>
            )}

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{plan.name}</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>{plan.desc}</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{
                  fontSize: 42, fontWeight: 800,
                  color: plan.featured ? "var(--neo-green)" : "var(--text-primary)",
                }}>
                  {plan.price}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{plan.period}</span>
              </div>
            </div>

            <ul style={{ listStyle: "none", marginBottom: 32, display: "flex", flexDirection: "column", gap: 12 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--neo-green)", fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => setModal({ open: true, plan: plan.id, planName: plan.name, price: plan.price + plan.period })}
              className={plan.featured ? "btn-primary" : "btn-secondary"}
              style={{ width: "100%", justifyContent: "center" }}>
              🟩 {plan.cta}
            </button>

            {/* Pix badge */}
            <div style={{
              marginTop: 12, textAlign: "center",
              fontSize: 11, color: "var(--text-muted)",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Pix instantâneo · sem cartão · sem burocracia
            </div>
          </div>
        ))}
      </div>

      {modal?.open && (
        <CheckoutModal
          plan={modal.plan}
          planName={modal.planName}
          price={modal.price}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
TSXEOF

echo "✅ Pricing.tsx atualizado com Pix"

# ═══ CHECKOUT MODAL ═══
cat > components/CheckoutModal.tsx << 'TSXEOF'
"use client";
import { useState } from "react";

interface Props {
  plan: string;
  planName: string;
  price: string;
  onClose: () => void;
}

type Step = "form" | "pix" | "done";

export default function CheckoutModal({ plan, planName, price, onClose }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pixData, setPixData] = useState<{
    qrCodeImage: string | null;
    brCode: string | null;
    correlationId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email, name }),
      });

      const data = await res.json() as any;

      if (!res.ok || !data.ok) {
        setError(data.error || "Erro ao gerar cobrança. Tente novamente.");
        setLoading(false);
        return;
      }

      setPixData({
        qrCodeImage: data.pix?.qrCodeImage || null,
        brCode: data.pix?.brCode || null,
        correlationId: data.correlationId,
      });
      setStep("pix");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    if (pixData?.brCode) {
      navigator.clipboard.writeText(pixData.brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(5, 5, 8, 0.85)",
      backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-accent)",
        borderRadius: "var(--radius-xl)",
        padding: "40px",
        maxWidth: 480, width: "100%",
        position: "relative",
        boxShadow: "0 40px 80px rgba(0,0,0,0.5), var(--neo-green-glow)",
        animation: "fadeUp 0.3s var(--ease-neo) forwards",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          background: "var(--border-subtle)", border: "none",
          borderRadius: "50%", width: 32, height: 32,
          cursor: "pointer", color: "var(--text-muted)", fontSize: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28, background: "var(--neo-green)",
              borderRadius: 8, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#000",
            }}>N</div>
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              Neo<span style={{ color: "var(--neo-green)" }}>Convert</span>
            </span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            {step === "form" ? `Plano ${planName}` : step === "pix" ? "Pague com Pix" : "Pagamento confirmado!"}
          </h2>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "3px 12px", borderRadius: "var(--radius-full)",
            background: "var(--neo-green-dim)", border: "1px solid var(--border-accent)",
          }}>
            <span style={{ color: "var(--neo-green)", fontWeight: 700, fontSize: 15 }}>{price}</span>
          </div>
        </div>

        {/* ═ STEP: FORM ═ */}
        {step === "form" && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 6, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Nome completo
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="Seu nome"
                style={{
                  width: "100%", padding: "12px 16px",
                  background: "var(--bg-base)", border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)", color: "var(--text-primary)",
                  fontSize: 15, outline: "none", transition: "border-color 150ms",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--border-accent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 6, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                E-mail
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="seu@email.com"
                style={{
                  width: "100%", padding: "12px 16px",
                  background: "var(--bg-base)", border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)", color: "var(--text-primary)",
                  fontSize: 15, outline: "none", transition: "border-color 150ms",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--border-accent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
              />
            </div>

            {error && (
              <div style={{
                padding: "10px 14px", background: "rgba(255,45,85,0.1)",
                border: "1px solid rgba(255,45,85,0.3)", borderRadius: "var(--radius-sm)",
                color: "#ff2d55", fontSize: 13,
              }}>{error}</div>
            )}

            <button type="submit" className="btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 4, opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? "⏳ Gerando Pix..." : "🟩 Gerar QR Code Pix"}
            </button>

            <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", fontFamily: "monospace" }}>
              🔒 Pagamento seguro via Pix · Ativação imediata
            </p>
          </form>
        )}

        {/* ═ STEP: PIX ═ */}
        {step === "pix" && pixData && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {pixData.qrCodeImage ? (
              <div style={{
                padding: 16, background: "#fff", borderRadius: "var(--radius-lg)",
                boxShadow: "0 0 40px rgba(0,255,157,0.2)",
              }}>
                <img src={`data:image/png;base64,${pixData.qrCodeImage}`}
                  alt="QR Code Pix" style={{ width: 200, height: 200, display: "block" }} />
              </div>
            ) : (
              <div style={{
                width: 200, height: 200, background: "var(--bg-base)",
                border: "2px dashed var(--border-accent)", borderRadius: "var(--radius-lg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 20,
              }}>
                QR Code disponível após integrar a chave Woovi
              </div>
            )}

            {pixData.brCode && (
              <div style={{ width: "100%" }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontFamily: "monospace", textAlign: "center" }}>
                  Pix Copia e Cola
                </p>
                <div style={{
                  background: "var(--bg-base)", border: "1px solid var(--border-accent)",
                  borderRadius: "var(--radius-md)", padding: "10px 14px",
                  fontSize: 11, color: "var(--neo-green)", fontFamily: "monospace",
                  wordBreak: "break-all", lineHeight: 1.6, marginBottom: 10,
                }}>
                  {pixData.brCode.slice(0, 80)}...
                </div>
                <button onClick={copyCode} className="btn-secondary"
                  style={{ width: "100%", justifyContent: "center" }}>
                  {copied ? "✅ Copiado!" : "📋 Copiar código Pix"}
                </button>
              </div>
            )}

            <div style={{
              padding: "12px 16px", background: "rgba(0,255,157,0.08)",
              border: "1px solid var(--border-accent)", borderRadius: "var(--radius-md)",
              fontSize: 13, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.6,
            }}>
              ✉️ Link de acesso enviado para <strong style={{ color: "var(--neo-green)" }}>{email}</strong>
              <br />após confirmação do pagamento
            </div>

            <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
              ⏱️ QR Code válido por 60 min · ID: {pixData.correlationId.slice(-12)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
TSXEOF

echo "✅ CheckoutModal.tsx criado"

echo ""
echo "════════════════════════════════════════"
echo "💳 Payment setup completo!"
echo ""
echo "⚠️  Configure as chaves em .env.local:"
echo "    WOOVI_API_KEY=sua_chave_woovi"
echo "    RESEND_API_KEY=sua_chave_resend"
echo ""
echo "▶  Reinicie o servidor: pnpm dev"
echo "════════════════════════════════════════"
