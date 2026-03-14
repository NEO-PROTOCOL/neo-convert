// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmailMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
}));

vi.mock("@/lib/mailtrap", () => ({
  sendEmail: sendEmailMock,
}));

import { POST } from "@/app/api/checkout/route";

type RateLimitGlobal = typeof globalThis & {
  __neoConvertRateLimitStore?: Map<string, { count: number; resetAt: number }>;
};

function createCheckoutRequest(
  body: Record<string, unknown>,
  headers?: Record<string, string>,
) {
  return new NextRequest("https://neo-convert.site/api/checkout", {
    method: "POST",
    headers: {
      host: "neo-convert.site",
      origin: "https://neo-convert.site",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.spyOn(console, "error").mockImplementation(() => {});
    sendEmailMock.mockReset();
    (globalThis as RateLimitGlobal).__neoConvertRateLimitStore?.clear();
    delete process.env.MAILTRAP_API_TOKEN;
    delete process.env.FLOWPAY_PRODUCT_ID_STARTER;
    delete process.env.FLOWPAY_PRODUCT_ID_PRO;
    delete process.env.FLOWPAY_PRODUCT_ID_BUSINESS;
    delete process.env.FLOWPAY_API_URL;
    process.env.FLOWPAY_INTERNAL_API_KEY = "flowpay-secret";
  });

  it("rejects requests from another origin", async () => {
    const request = createCheckoutRequest(
      {
        planId: "pro",
        name: "Neo",
        email: "neo@example.com",
      },
      {
        origin: "https://attacker.site",
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden origin",
    });
  });

  it("returns 503 when the internal payment api key is missing", async () => {
    delete process.env.FLOWPAY_INTERNAL_API_KEY;

    const response = await POST(
      createCheckoutRequest({
        planId: "starter",
        name: "Neo",
        email: "neo@example.com",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Serviço de pagamento indisponível no momento.",
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

    const response = await POST(
      createCheckoutRequest({
        planId: "pro",
        name: "Neo",
        email: "neo@example.com",
      }),
    );

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      error: "Timeout ao criar cobrança. Tente novamente.",
    });
  });

  it("returns the normalized pix payload when FlowPay succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          pix_data: {
            br_code: "br-code-123",
            qr_code: "base64-qr",
            correlation_id: "flowpay-correlation",
            expires_at: "2026-03-07T00:00:00.000Z",
          },
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

    const response = await POST(
      createCheckoutRequest({
        planId: "business",
        name: "Neo MellO",
        email: "NEO@example.com",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      correlationID: "flowpay-correlation",
      brCode: "br-code-123",
      qrCode: "data:image/png;base64,base64-qr",
      expiresAt: "2026-03-07T00:00:00.000Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.flowpay.cash/api/create-charge",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "flowpay-secret",
        }),
      }),
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
