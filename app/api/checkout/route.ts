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

const PLANS: Record<string, { name: string; value: number; label: string }> = {
    starter: { name: "NeoConvert Starter", value: 750, label: "R$ 7,50/mês" },
    pro: { name: "NeoConvert Pro", value: 2900, label: "R$ 29/mês" },
    business: { name: "NeoConvert Business", value: 7900, label: "R$ 79/mês" },
};

const CHECKOUT_RATE_LIMIT = 8;
const CHECKOUT_WINDOW_MS = 15 * 60 * 1000;
const WOOVI_TIMEOUT_MS = 12_000;

function isKnownPlan(planId: string): planId is keyof typeof PLANS {
    return Object.prototype.hasOwnProperty.call(PLANS, planId);
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
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
    const rateLimit = enforceRateLimit(`checkout:${ip}`, CHECKOUT_RATE_LIMIT, CHECKOUT_WINDOW_MS);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Muitas tentativas. Aguarde alguns minutos." },
            { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
        );
    }

    try {
        const contentType = req.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
            return NextResponse.json(
                { error: "Content-Type inválido. Use application/json." },
                { status: 415 }
            );
        }

        let payload: { planId?: unknown; name?: unknown; email?: unknown };
        try {
            payload = await req.json() as { planId?: unknown; name?: unknown; email?: unknown };
        } catch {
            return NextResponse.json(
                { error: "JSON inválido." },
                { status: 400 }
            );
        }
        const planId = typeof payload.planId === "string" ? payload.planId.trim() : "";
        const name = normalizeText(payload.name, 80);
        const email = normalizeEmail(payload.email);

        if (!planId || !name || !email) {
            return NextResponse.json(
                { error: "planId, name e email são obrigatórios" },
                { status: 400 }
            );
        }

        if (!isKnownPlan(planId)) {
            return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
        }
        const plan = PLANS[planId];

        const wooviAuthToken = process.env.WOOVI_API_KEY || process.env.APP_ID;
        if (!wooviAuthToken) {
            console.error("WOOVI_API_KEY/APP_ID não configurado");
            return NextResponse.json(
                { error: "Serviço de pagamento indisponível no momento." },
                { status: 503 }
            );
        }

        let wooviBaseUrl: URL;
        try {
            wooviBaseUrl = new URL(process.env.WOOVI_API_URL || "https://api.woovi.com");
        } catch {
            console.error("WOOVI_API_URL inválido");
            return NextResponse.json(
                { error: "Configuração de pagamento inválida." },
                { status: 500 }
            );
        }

        const correlationID = `neoconvert-${randomUUID()}`;

        let wooviRes: Response;
        try {
            wooviRes = await fetchWithTimeout(
                new URL("/api/v1/charge", wooviBaseUrl).toString(),
                {
                    method: "POST",
                    headers: {
                        Authorization: wooviAuthToken,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        correlationID,
                        value: plan.value,
                        comment: plan.name,
                        expiresIn: 3600,
                        customer: { name, email },
                        additionalInfo: [{ key: "Plano", value: plan.name }],
                    }),
                },
                WOOVI_TIMEOUT_MS
            );
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                return NextResponse.json(
                    { error: "Timeout ao criar cobrança. Tente novamente." },
                    { status: 504 }
                );
            }
            console.error("Erro de conexão com Woovi:", error);
            return NextResponse.json(
                { error: "Falha ao conectar no provedor de pagamento." },
                { status: 502 }
            );
        }

        if (!wooviRes.ok) {
            const err = (await wooviRes.text()).slice(0, 500);
            console.error("Woovi error:", wooviRes.status, err);
            return NextResponse.json(
                { error: "Erro ao criar cobrança Pix. Tente novamente." },
                { status: 502 }
            );
        }

        const wooviData = await wooviRes.json() as {
            charge?: {
                brCode?: unknown;
                expiresAt?: unknown;
                pixQrCode?: {
                    payload?: unknown;
                    encodedImage?: unknown;
                };
            };
        };
        const charge = wooviData.charge;

        if (!charge || typeof charge !== "object") {
            console.error("Resposta da Woovi sem objeto charge");
            return NextResponse.json(
                { error: "Resposta inválida do provedor de pagamento." },
                { status: 502 }
            );
        }

        const brCode = typeof charge.brCode === "string"
            ? charge.brCode
            : (typeof charge.pixQrCode?.payload === "string" ? charge.pixQrCode.payload : undefined);
        const qrCode = typeof charge.pixQrCode?.encodedImage === "string"
            ? charge.pixQrCode.encodedImage
            : undefined;
        const expiresAt = typeof charge.expiresAt === "string" ? charge.expiresAt : undefined;

        // Enviar email de confirmação via Mailtrap
        if (process.env.MAILTRAP_API_TOKEN) {
            const safeName = escapeHtml(name);
            const safePlanName = escapeHtml(plan.name);
            const safePlanLabel = escapeHtml(plan.label);
            const safeCorrelationID = escapeHtml(correlationID);
            const safePixCode = brCode ? escapeHtml(brCode) : "";
            const qrImage = qrCode
                ? `<img src="data:image/png;base64,${qrCode}" width="200" height="200" alt="QR Code Pix" style="border-radius:12px;" />`
                : "";

            try {
                await sendEmail({
                    to: email,
                    subject: `Seu Pix para ${plan.name} | NeoConvert`,
                    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050508;font-family:'Segoe UI',system-ui,sans-serif;color:#e8e8f0;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:28px;font-weight:800;margin:0 0 8px;">Seu Pix está pronto</h1>
      <p style="color:rgba(232,232,240,0.6);margin:0;">Olá, ${safeName}. Use o QR Code ou o código abaixo para ativar seu plano ${safePlanName}.</p>
    </div>
    <div style="background:#13131a;border:1px solid rgba(0,255,157,0.2);border-radius:20px;padding:32px;text-align:center;margin-bottom:24px;">
      <div style="font-size:36px;font-weight:800;color:#00ff9d;margin-bottom:4px;">${safePlanLabel}</div>
      <div style="color:rgba(232,232,240,0.5);font-size:13px;margin-bottom:24px;">Plano ${safePlanName}</div>
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
        <li>Sua conta será ativada automaticamente em minutos</li>
      </ol>
    </div>
    <div style="text-align:center;font-size:12px;color:rgba(232,232,240,0.3);">
      <p>Dúvidas? <a href="mailto:suporte@neo-convert.site" style="color:#00ff9d;text-decoration:none;">suporte@neo-convert.site</a></p>
      <p style="margin-top:8px;">© ${new Date().getFullYear()} NeoConvert</p>
    </div>
  </div>
</body>
</html>`,
                });
            } catch (error) {
                console.error("Falha ao enviar email de checkout:", error);
            }
        }

        const response = NextResponse.json({
            success: true,
            correlationID,
            brCode,
            qrCode,
            expiresAt,
        });
        response.headers.set("Cache-Control", "no-store");
        return response;
    } catch (error) {
        console.error("Checkout error:", error);
        return NextResponse.json(
            { error: "Erro interno do servidor" },
            { status: 500 }
        );
    }
}
