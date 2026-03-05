import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp, isSameOriginRequest } from "@/lib/security";

const STATUS_RATE_LIMIT = 60;
const STATUS_WINDOW_MS = 15 * 60 * 1000;
const FLOWPAY_TIMEOUT_MS = 10_000;
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

function sanitizeChargeId(rawValue: string): string | null {
    const value = rawValue.trim();
    if (value.length < 3 || value.length > 100) return null;
    if (!/^[a-zA-Z0-9._:-]+$/.test(value)) return null;
    return value;
}

function resolveFlowpayChargeStatusUrl(rawValue: string | undefined, chargeId: string): string | null {
    const fallback = "https://api.flowpay.cash";

    try {
        const url = new URL(rawValue || fallback);
        if (url.hostname === "flowpay.cash" || url.hostname === "www.flowpay.cash") {
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

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ chargeId: string }> }
) {
    if (!isSameOriginRequest(req)) {
        return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
    }

    const ip = getClientIp(req);
    const rateLimit = enforceRateLimit(`checkout-status:${ip}`, STATUS_RATE_LIMIT, STATUS_WINDOW_MS);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Muitas consultas de status. Aguarde alguns instantes." },
            { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
        );
    }

    const { chargeId: rawChargeId } = await context.params;
    const chargeId = sanitizeChargeId(rawChargeId);
    if (!chargeId) {
        return NextResponse.json({ error: "ID de cobrança inválido." }, { status: 400 });
    }

    const flowpayApiKey = process.env.FLOWPAY_INTERNAL_API_KEY || process.env.FLOWPAY_API_KEY;
    if (!flowpayApiKey) {
        return NextResponse.json(
            { error: "Serviço de pagamento indisponível no momento." },
            { status: 503 }
        );
    }

    const flowpayStatusUrl = resolveFlowpayChargeStatusUrl(process.env.FLOWPAY_API_URL, chargeId);
    if (!flowpayStatusUrl) {
        return NextResponse.json(
            { error: "Configuração de pagamento inválida." },
            { status: 500 }
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
            FLOWPAY_TIMEOUT_MS
        );
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            return NextResponse.json({ error: "Timeout ao consultar status." }, { status: 504 });
        }
        return NextResponse.json({ error: "Falha ao consultar status do pagamento." }, { status: 502 });
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
            { status: 502 }
        );
    }

    const data = await flowpayRes.json() as {
        status?: unknown;
        paid_at?: unknown;
    };
    const rawStatus = typeof data.status === "string" ? data.status : "CREATED";
    const status = rawStatus.trim().toUpperCase();
    const paid = PAID_STATUSES.has(status);
    const paidAt = typeof data.paid_at === "string" ? data.paid_at : null;

    const response = NextResponse.json({
        success: true,
        status,
        paid,
        paidAt,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
}
