import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailtrap";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  escapeHtml,
  getClientIp,
  isSameOriginRequest,
  normalizeEmail,
  normalizeText,
} from "@/lib/security";

const PLANS = {
  starter: {
    name: "NeoConvert Unitário",
    value: 750,
    label: "R$ 7,50 por operação",
  },
  pro: { name: "NeoConvert Pro", value: 2900, label: "R$ 29/mês" },
  business: { name: "NeoConvert Business", value: 7900, label: "R$ 79/mês" },
} as const;

type PlanId = keyof typeof PLANS;

const CHECKOUT_RATE_LIMIT = 8;
const CHECKOUT_WINDOW_MS = 15 * 60 * 1000;
const FLOWPAY_TIMEOUT_MS = 12_000;

function isKnownPlan(planId: string): planId is PlanId {
  return Object.prototype.hasOwnProperty.call(PLANS, planId);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveQrImageSrc(qrCode: string | undefined): string | undefined {
  if (!qrCode) return undefined;
  const trimmed = qrCode.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (isHttpUrl(trimmed)) return trimmed;
  return `data:image/png;base64,${trimmed}`;
}

function resolveFlowpayProductId(planId: PlanId): string {
  const byPlan: Record<PlanId, string | undefined> = {
    starter: process.env.FLOWPAY_PRODUCT_ID_STARTER,
    pro: process.env.FLOWPAY_PRODUCT_ID_PRO,
    business: process.env.FLOWPAY_PRODUCT_ID_BUSINESS,
  };

  const configured = byPlan[planId]?.trim();
  return configured && configured.length > 0 ? configured : planId;
}

function resolveFlowpayCreateChargeUrl(
  rawValue: string | undefined,
): string | null {
  const fallback = "https://api.flowpay.cash";

  try {
    const url = new URL(rawValue || fallback);
    if (
      url.hostname === "flowpay.cash" ||
      url.hostname === "www.flowpay.cash"
    ) {
      url.hostname = "api.flowpay.cash";
    }
    const path = url.pathname.replace(/\/+$/, "");

    if (path === "" || path === "/") {
      url.pathname = "/api/create-charge";
    } else if (path === "/api") {
      url.pathname = "/api/create-charge";
    } else if (path.endsWith("/api/create-charge")) {
      url.pathname = path;
    } else {
      url.pathname = `${path}/api/create-charge`;
    }

    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(
    `checkout:${ip}`,
    CHECKOUT_RATE_LIMIT,
    CHECKOUT_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type inválido. Use application/json." },
        { status: 415 },
      );
    }

    let payload: { planId?: unknown; name?: unknown; email?: unknown };
    try {
      payload = (await req.json()) as {
        planId?: unknown;
        name?: unknown;
        email?: unknown;
      };
    } catch {
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }
    const planId =
      typeof payload.planId === "string" ? payload.planId.trim() : "";
    const name = normalizeText(payload.name, 80);
    const email = normalizeEmail(payload.email);

    if (!planId || !name || !email) {
      return NextResponse.json(
        { error: "planId, name e email são obrigatórios" },
        { status: 400 },
      );
    }

    if (!isKnownPlan(planId)) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }
    const plan = PLANS[planId];
    const flowpayProductId = resolveFlowpayProductId(planId);

    const flowpayApiKey = process.env.FLOWPAY_INTERNAL_API_KEY;
    if (!flowpayApiKey) {
      console.error("FLOWPAY_INTERNAL_API_KEY não configurado");
      return NextResponse.json(
        { error: "Serviço de pagamento indisponível no momento." },
        { status: 503 },
      );
    }

    const flowpayChargeUrl = resolveFlowpayCreateChargeUrl(
      process.env.FLOWPAY_API_URL,
    );
    if (!flowpayChargeUrl) {
      console.error("FLOWPAY_API_URL inválido");
      return NextResponse.json(
        { error: "Configuração de pagamento inválida." },
        { status: 500 },
      );
    }

    const correlationID = `neoconvert-${randomUUID()}`;
    const amountBrl = Number((plan.value / 100).toFixed(2));

    let flowpayRes: Response;
    try {
      flowpayRes = await fetchWithTimeout(
        flowpayChargeUrl,
        {
          method: "POST",
          headers: {
            "x-api-key": flowpayApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            wallet: "neo-convert",
            valor: amountBrl,
            moeda: "BRL",
            id_transacao: correlationID,
            product_id: flowpayProductId,
            customer_name: name,
            customer_email: email,
          }),
        },
        FLOWPAY_TIMEOUT_MS,
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          { error: "Timeout ao criar cobrança. Tente novamente." },
          { status: 504 },
        );
      }
      console.error("Erro de conexão com FlowPay API:", error);
      return NextResponse.json(
        { error: "Falha ao conectar no provedor de pagamento." },
        { status: 502 },
      );
    }

    if (!flowpayRes.ok) {
      const err = (await flowpayRes.text()).slice(0, 500);
      console.error("FlowPay API error:", flowpayRes.status, err);
      if (flowpayRes.status === 401 || flowpayRes.status === 403) {
        return NextResponse.json(
          {
            error:
              "Integração de pagamento não autorizada. Verifique a chave interna da FlowPay.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "Erro ao criar cobrança Pix. Tente novamente." },
        { status: 502 },
      );
    }

    const flowpayData = (await flowpayRes.json()) as {
      pix_data?: {
        qr_code?: unknown;
        br_code?: unknown;
        correlation_id?: unknown;
        expires_at?: unknown;
      };
      id_transacao?: unknown;
    };
    const pix = flowpayData.pix_data;

    if (!pix || typeof pix !== "object") {
      console.error("Resposta da FlowPay API sem objeto pix_data");
      return NextResponse.json(
        { error: "Resposta inválida do provedor de pagamento." },
        { status: 502 },
      );
    }

    const brCode = asString(pix.br_code);
    const qrCode = asString(pix.qr_code);
    const qrCodeSrc = resolveQrImageSrc(qrCode);
    const expiresAt = asString(pix.expires_at);
    const effectiveCorrelationId =
      asString(pix.correlation_id) ||
      asString(flowpayData.id_transacao) ||
      correlationID;

    if (!brCode && !qrCodeSrc) {
      console.error("FlowPay API sem dados Pix utilizáveis");
      return NextResponse.json(
        { error: "Cobrança criada sem QR Code. Tente novamente." },
        { status: 502 },
      );
    }

    // Gatilho 1: cobrança criada (pagamento pendente) via Mailtrap
    if (process.env.MAILTRAP_API_TOKEN) {
      const safeName = escapeHtml(name);
      const safePlanName = escapeHtml(plan.name);
      const safePlanLabel = escapeHtml(plan.label);
      const safeCorrelationID = escapeHtml(effectiveCorrelationId);
      const safePixCode = brCode ? escapeHtml(brCode) : "";
      const qrImage = qrCodeSrc
        ? `<img src="${escapeHtml(qrCodeSrc)}" width="200" height="200" alt="QR Code Pix" style="border-radius:12px;" />`
        : "";
      const pendingTemplateUuid =
        process.env.MAILTRAP_CHECKOUT_PENDING_TEMPLATE_ID;

      try {
        if (pendingTemplateUuid) {
          await sendEmail({
            to: email,
            templateUuid: pendingTemplateUuid,
            templateVariables: {
              name,
              product_name: plan.name,
              product_label: plan.label,
              transaction_id: effectiveCorrelationId,
              pix_code: brCode ?? "",
              expires_at: expiresAt ?? "",
            },
          });
        } else {
          await sendEmail({
            to: email,
            subject: `Pagamento pendente: ${plan.name} | NΞØ CONVΞRT`,
            html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050508;font-family:'Segoe UI',system-ui,sans-serif;color:#e8e8f0;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:28px;font-weight:800;margin:0 0 8px;">Seu Pix foi gerado</h1>
      <p style="color:rgba(232,232,240,0.6);margin:0;">Olá, ${safeName}. Use o QR Code ou o código abaixo para concluir o pagamento de ${safePlanName}.</p>
    </div>
    <div style="background:#13131a;border:1px solid rgba(0,255,157,0.2);border-radius:20px;padding:32px;text-align:center;margin-bottom:24px;">
      <div style="font-size:36px;font-weight:800;color:#00ff9d;margin-bottom:4px;">${safePlanLabel}</div>
      <div style="color:rgba(232,232,240,0.5);font-size:13px;margin-bottom:24px;">Produto: ${safePlanName}</div>
      ${qrImage ? `<div style="margin-bottom:24px;">${qrImage}</div>` : ""}
      ${safePixCode ? `<div style="background:#0a0a0f;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;word-break:break-all;font-family:monospace;font-size:11px;color:rgba(232,232,240,0.7);text-align:left;margin-bottom:16px;">${safePixCode}</div>` : ""}
      <div style="font-size:12px;color:rgba(232,232,240,0.4);">ID: ${safeCorrelationID}</div>
    </div>
    <div style="background:#13131a;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:24px;margin-bottom:24px;">
      <h3 style="font-size:14px;font-weight:700;margin:0 0 12px;color:#00ff9d;">Como pagar</h3>
      <ol style="margin:0;padding:0 0 0 20px;color:rgba(232,232,240,0.6);font-size:14px;line-height:2;">
        <li>Abra o app do seu banco</li>
        <li>Escaneie o QR Code ou copie o código Pix</li>
        <li>Confirme o pagamento</li>
        <li>Seu acesso de download será liberado automaticamente</li>
      </ol>
    </div>
    <div style="text-align:center;font-size:12px;color:rgba(232,232,240,0.3);">
      <p>Dúvidas? <a href="mailto:suporte@neo-convert.site" style="color:#00ff9d;text-decoration:none;">suporte@neo-convert.site</a></p>
      <p style="margin-top:8px;">© ${new Date().getFullYear()} NΞØ CONVΞRT</p>
    </div>
  </div>
</body>
</html>`,
          });
        }
      } catch (error) {
        console.error("Falha ao enviar e-mail de cobrança pendente:", error);
      }
    }

    const response = NextResponse.json({
      success: true,
      correlationID: effectiveCorrelationId,
      brCode,
      qrCode: qrCodeSrc,
      expiresAt,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
