// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const statusMocks = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
  createDownloadTokenMock: vi.fn(),
}));

vi.mock("@/lib/mailtrap", () => ({
  sendEmail: statusMocks.sendEmailMock,
}));

vi.mock("@/lib/download-token", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/download-token")>(
      "@/lib/download-token",
    );

  return {
    ...actual,
    createDownloadToken: statusMocks.createDownloadTokenMock,
  };
});

import { GET } from "@/app/api/checkout/status/[chargeId]/route";

type RateLimitGlobal = typeof globalThis & {
  __neoConvertRateLimitStore?: Map<string, { count: number; resetAt: number }>;
};

function createStatusRequest(options?: {
  chargeId?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}) {
  const url = new URL(
    `https://neo-convert.site/api/checkout/status/${options?.chargeId ?? "charge-123"}`,
  );

  if (options?.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }

  const request = new NextRequest(url, {
    method: "GET",
    headers: {
      host: "neo-convert.site",
      origin: "https://neo-convert.site",
      ...options?.headers,
    },
  });

  return {
    request,
    context: {
      params: Promise.resolve({
        chargeId: options?.chargeId ?? "charge-123",
      }),
    },
  };
}

describe("GET /api/checkout/status/[chargeId]", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    statusMocks.sendEmailMock.mockReset();
    statusMocks.createDownloadTokenMock.mockReset();
    statusMocks.createDownloadTokenMock.mockReturnValue("download-token-123");
    (globalThis as RateLimitGlobal).__neoConvertRateLimitStore?.clear();
    delete process.env.MAILTRAP_API_TOKEN;
    delete process.env.MAILTRAP_PAYMENT_SUCCESS_TEMPLATE_ID;
    delete process.env.FLOWPAY_API_URL;
    process.env.FLOWPAY_INTERNAL_API_KEY = "flowpay-secret";
  });

  it("rejects invalid charge identifiers", async () => {
    const { request, context } = createStatusRequest({
      chargeId: "../bad",
    });

    const response = await GET(request, context);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "ID de cobrança inválido.",
    });
  });

  it("returns not found when the provider does not know the charge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );

    const { request, context } = createStatusRequest({
      chargeId: "missing-charge",
    });
    const response = await GET(request, context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      status: "NOT_FOUND",
      paid: false,
      paidAt: null,
    });
  });

  it("translates provider timeouts into 504", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("timeout"), { name: "AbortError" }),
        ),
    );

    const { request, context } = createStatusRequest({
      chargeId: "slow-charge",
    });
    const response = await GET(request, context);

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      error: "Timeout ao consultar status.",
    });
  });

  it("creates a download token and sends confirmation email for paid charges", async () => {
    process.env.MAILTRAP_API_TOKEN = "mailtrap-secret";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "paid",
          paid_at: "2026-03-07T01:00:00.000Z",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { request, context } = createStatusRequest({
      chargeId: "charge-paid-1",
      query: {
        notifyEmail: "neo@example.com",
        notifyName: "NEO",
        notifyAmount: "R$ 29/mês",
      },
    });
    const response = await GET(request, context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      status: "PAID",
      paid: true,
      paidAt: "2026-03-07T01:00:00.000Z",
      paymentEmailSent: true,
      downloadToken: "download-token-123",
    });
    expect(statusMocks.createDownloadTokenMock).toHaveBeenCalledWith(
      "charge-paid-1",
      "starter",
    );
    expect(statusMocks.sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "neo@example.com",
        subject: "Pagamento confirmado | NΞØ CONVΞRT",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.flowpay.cash/api/charge/charge-paid-1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "x-api-key": "flowpay-secret",
        }),
      }),
    );
  });
});
