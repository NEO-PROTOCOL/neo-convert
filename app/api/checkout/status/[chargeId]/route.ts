import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailtrap";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createDownloadToken } from "@/lib/download-token";
import {
  escapeHtml,
  getClientIp,
  isSameOriginRequest,
  normalizeEmail,
  normalizeText,
} from "@/lib/security";

const STATUS_RATE_LIMIT = 60;
const STATUS_WINDOW_MS = 15 * 60 * 1000;
const FLOWPAY_TIMEOUT_MS = 10_000;
const EMAIL_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
const PAID_STATUSES = new Set([
  "PAID",
  "COMPLETED",
  "CONFIRMED",
  "RECEIVED",
  "PIX_PAID",
  "PENDING_REVIEW",
  "APPROVED",
  "SETTLED",
]);
const sentPaymentEmails = new Map<string, number>();

function markEmailSentIfFirst(chargeId: string): boolean {
  const now = Date.now();

  for (const [id, timestamp] of sentPaymentEmails.entries()) {
    if (now - timestamp > EMAIL_DEDUPE_WINDOW_MS) {
      sentPaymentEmails.delete(id);
    }
  }

  if (sentPaymentEmails.has(chargeId)) return false;
  sentPaymentEmails.set(chargeId, now);
  return true;
}

function sanitizeChargeId(rawValue: string): string | null {
  const value = rawValue.trim();
  if (value.length < 3 || value.length > 100) return null;
  if (!/^[a-zA-Z0-9._:-]+$/.test(value)) return null;
  return value;
}

function resolveFlowpayChargeStatusUrl(
  rawValue: string | undefined,
  chargeId: string,
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
    url.pathname = `/api/charge/${encodeURIComponent(chargeId)}`;
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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ chargeId: string }> },
) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(
    `checkout-status:${ip}`,
    STATUS_RATE_LIMIT,
    STATUS_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas consultas de status. Aguarde alguns instantes." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const { chargeId: rawChargeId } = await context.params;
  const chargeId = sanitizeChargeId(rawChargeId);
  if (!chargeId) {
    return NextResponse.json(
      { error: "ID de cobrança inválido." },
      { status: 400 },
    );
  }

  const flowpayApiKey = process.env.FLOWPAY_INTERNAL_API_KEY;
  if (!flowpayApiKey) {
    return NextResponse.json(
      { error: "Serviço de pagamento indisponível no momento." },
      { status: 503 },
    );
  }

  const flowpayStatusUrl = resolveFlowpayChargeStatusUrl(
    process.env.FLOWPAY_API_URL,
    chargeId,
  );
  if (!flowpayStatusUrl) {
    return NextResponse.json(
      { error: "Configuração de pagamento inválida." },
      { status: 500 },
    );
  }

  let flowpayRes: Response;
  try {
    flowpayRes = await fetchWithTimeout(
      flowpayStatusUrl,
      {
        method: "GET",
        headers: {
          "x-api-key": flowpayApiKey,
          "Content-Type": "application/json",
        },
      },
      FLOWPAY_TIMEOUT_MS,
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Timeout ao consultar status." },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "Falha ao consultar status do pagamento." },
      { status: 502 },
    );
  }

  if (flowpayRes.status === 404) {
    const response = NextResponse.json({
      success: true,
      status: "NOT_FOUND",
      paid: false,
      paidAt: null,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  if (!flowpayRes.ok) {
    const err = (await flowpayRes.text()).slice(0, 500);
    console.error("FlowPay status error:", flowpayRes.status, err);
    return NextResponse.json(
      { error: "Erro ao consultar status da cobrança." },
      { status: 502 },
    );
  }

  const data = (await flowpayRes.json()) as {
    status?: unknown;
    paid_at?: unknown;
  };
  const rawStatus = typeof data.status === "string" ? data.status : "CREATED";
  const status = rawStatus.trim().toUpperCase();
  const paid = PAID_STATUSES.has(status);
  const paidAt = typeof data.paid_at === "string" ? data.paid_at : null;
  let paymentEmailSent = false;

  // Gatilho 2: confirmação de pagamento (somente quando status pago)
  if (paid && process.env.MAILTRAP_API_TOKEN) {
    const notifyEmail = normalizeEmail(
      req.nextUrl.searchParams.get("notifyEmail"),
    );
    const notifyName =
      normalizeText(req.nextUrl.searchParams.get("notifyName"), 80) ||
      "Cliente";
    const notifyAmount =
      normalizeText(req.nextUrl.searchParams.get("notifyAmount"), 40) ||
      "pagamento confirmado";

    if (notifyEmail && markEmailSentIfFirst(chargeId)) {
      const templateUuid = process.env.MAILTRAP_PAYMENT_SUCCESS_TEMPLATE_ID;
      try {
        if (templateUuid) {
          await sendEmail({
            to: notifyEmail,
            templateUuid,
            templateVariables: {
              name: notifyName,
              amount: notifyAmount,
              transaction_id: chargeId,
            },
          });
        } else {
          const safeName = escapeHtml(notifyName);
          const safeAmount = escapeHtml(notifyAmount);
          const safeChargeId = escapeHtml(chargeId);
          await sendEmail({
            to: notifyEmail,
            subject: `Pagamento confirmado | NΞØ CONVΞRT`,
            html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050508;font-family:'Segoe UI',system-ui,sans-serif;color:#e8e8f0;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <h1 style="font-size:28px;font-weight:800;margin:0 0 10px;">Pagamento confirmado</h1>
    <p style="color:rgba(232,232,240,0.65);line-height:1.7;margin:0 0 20px;">Olá, ${safeName}. Confirmamos o pagamento de ${safeAmount}.</p>
    <div style="background:#13131a;border:1px solid rgba(0,255,157,0.2);border-radius:16px;padding:20px;">
      <p style="margin:0 0 8px;font-size:13px;color:rgba(232,232,240,0.5);">Transação</p>
      <p style="margin:0;font-size:13px;color:#00ff9d;word-break:break-all;font-family:monospace;">${safeChargeId}</p>
    </div>
    <p style="margin:20px 0 0;font-size:12px;color:rgba(232,232,240,0.4);">Seu download já está liberado no fluxo atual.</p>
  </div>
</body>
</html>`,
          });
        }
        paymentEmailSent = true;
      } catch (error) {
        console.error("Falha ao enviar confirmação de pagamento:", error);
      }
    }
  }

  // Issue a server-signed download token when payment is confirmed.
  // The client must present this token to upload-to-cloud to get a cloud link.
  // Derive the plan from the payment status (if available) to avoid hardcoding "starter".
  const plan =
    status && typeof status === "object" && "plan" in (status as any) && typeof (status as any).plan === "string"
      ? (status as any).plan
      : "starter";

  const downloadToken = paid
    ? createDownloadToken(chargeId, plan)
    : undefined;

  const response = NextResponse.json({
    success: true,
    status,
    paid,
    paidAt,
    paymentEmailSent,
    ...(downloadToken ? { downloadToken } : {}),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
