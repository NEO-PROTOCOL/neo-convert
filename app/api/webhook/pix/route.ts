import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailtrap";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
    escapeHtml,
    getClientIp,
    normalizeEmail,
    normalizeText,
    resolvePublicAppUrl,
} from "@/lib/security";

const WEBHOOK_RATE_LIMIT = 120;
const WEBHOOK_WINDOW_MS = 60 * 1000;
const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;
const SIGNATURE_HEX_REGEX = /^[0-9a-f]{64}$/i;
const PROCESSED_TTL_MS = 24 * 60 * 60 * 1000;

declare global {
    var __neoConvertProcessedWebhookIds: Map<string, number> | undefined;
}

const processedWebhookIds = global.__neoConvertProcessedWebhookIds ?? new Map<string, number>();
if (!global.__neoConvertProcessedWebhookIds) {
    global.__neoConvertProcessedWebhookIds = processedWebhookIds;
}

function isValidSignature(body: string, signature: string, secret: string): boolean {
    if (!SIGNATURE_HEX_REGEX.test(signature)) return false;

    const expected = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

    const expectedBuffer = Buffer.from(expected, "hex");
    const providedBuffer = Buffer.from(signature, "hex");
    if (expectedBuffer.length !== providedBuffer.length) return false;

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function rememberWebhookId(id: string): boolean {
    const now = Date.now();

    if (processedWebhookIds.size > 5000) {
        for (const [key, expiresAt] of processedWebhookIds.entries()) {
            if (expiresAt <= now) {
                processedWebhookIds.delete(key);
            }
        }
    }

    const current = processedWebhookIds.get(id);
    if (current && current > now) {
        return false;
    }

    processedWebhookIds.set(id, now + PROCESSED_TTL_MS);
    return true;
}

export async function POST(req: NextRequest) {
    const ip = getClientIp(req);
    const rateLimit = enforceRateLimit(`woovi-webhook:${ip}`, WEBHOOK_RATE_LIMIT, WEBHOOK_WINDOW_MS);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Too Many Requests" },
            { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
        );
    }

    const webhookSecret = process.env.WOOVI_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error("WOOVI_WEBHOOK_SECRET não configurado");
        return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_WEBHOOK_BODY_BYTES) {
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const signature = req.headers.get("x-webhook-signature") || req.headers.get("x-woovi-signature");
    if (!signature || !isValidSignature(rawBody, signature, webhookSecret)) {
        console.error("Assinatura do webhook inválida");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: {
        event?: unknown;
        charge?: {
            correlationID?: unknown;
            status?: unknown;
            customer?: { name?: unknown; email?: unknown };
            comment?: unknown;
        };
    };

    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const event = normalizeText(payload.event, 120);
    const charge = payload.charge;
    const status = normalizeText(charge?.status, 50);

    const isPaymentCompleted = event === "OPENPIX:CHARGE_COMPLETED" || status === "COMPLETED";
    if (!isPaymentCompleted) {
        return NextResponse.json({ received: true, event: event || "unknown" });
    }

    const correlationID = normalizeText(charge?.correlationID, 120);
    if (!correlationID) {
        return NextResponse.json({ error: "Missing correlationID" }, { status: 400 });
    }

    const firstTimeSeen = rememberWebhookId(correlationID);
    if (!firstTimeSeen) {
        return NextResponse.json({ received: true, processed: "duplicate_ignored" });
    }

    const customerEmail = normalizeEmail(charge?.customer?.email);
    const customerName = normalizeText(charge?.customer?.name, 80);
    const planName = normalizeText(charge?.comment, 80) ?? "NeoConvert";
    const appUrl = resolvePublicAppUrl(process.env.NEXT_PUBLIC_APP_URL);

    console.log(`Pagamento confirmado para ${correlationID}`);

    // TODO: Ativar assinatura no banco de dados
    // await db.subscription.activate({ correlationID, email: customerEmail });

    if (customerEmail && process.env.MAILTRAP_API_TOKEN) {
        const safeCorrelationID = escapeHtml(correlationID);
        const safePlanName = escapeHtml(planName);
        const safeCustomerName = customerName ? `, ${escapeHtml(customerName)}` : "";
        const safeAppUrl = escapeHtml(appUrl);

        try {
            await sendEmail({
                to: customerEmail,
                subject: `Pagamento confirmado | ${planName}`,
                html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050508;font-family:'Segoe UI',system-ui,sans-serif;color:#e8e8f0;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:28px;font-weight:800;margin:0 0 8px;">Pagamento confirmado</h1>
      <p style="color:rgba(232,232,240,0.6);margin:0;">
        Olá${safeCustomerName}. Seu Pix foi recebido e sua assinatura está ativa.
      </p>
    </div>

    <div style="background:#13131a;border:1px solid rgba(0,255,157,0.3);border-radius:20px;padding:32px;text-align:center;margin-bottom:24px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(0,255,157,0.1);border:1px solid rgba(0,255,157,0.3);border-radius:999px;padding:8px 20px;margin-bottom:16px;">
        <span style="color:#00ff9d;font-weight:700;">Assinatura ativa | ${safePlanName}</span>
      </div>
      <p style="color:rgba(232,232,240,0.6);font-size:14px;margin:0;">
        Acesse todas as ferramentas premium em <a href="${safeAppUrl}" style="color:#00ff9d;text-decoration:none;">neo-convert.site</a>
      </p>
    </div>

    <div style="text-align:center;font-size:12px;color:rgba(232,232,240,0.3);">
      <p>ID da cobrança: ${safeCorrelationID}</p>
      <p style="margin-top:8px;">Dúvidas? <a href="mailto:suporte@neo-convert.site" style="color:#00ff9d;text-decoration:none;">suporte@neo-convert.site</a></p>
      <p style="margin-top:8px;">© ${new Date().getFullYear()} NeoConvert</p>
    </div>
  </div>
</body>
</html>`,
            });
        } catch (error) {
            console.error("Falha ao enviar email de confirmação:", error);
        }
    }

    return NextResponse.json({ received: true, processed: "payment_confirmed" });
}
