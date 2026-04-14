// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadMocks = vi.hoisted(() => {
  class BlobAccessError extends Error {}

  return {
    BlobAccessError,
    putMock: vi.fn(),
    validateDownloadTokenMock: vi.fn(),
  };
});

vi.mock("@vercel/blob", () => ({
  put: uploadMocks.putMock,
  BlobAccessError: uploadMocks.BlobAccessError,
}));

vi.mock("@/lib/download-token", () => ({
  validateDownloadToken: uploadMocks.validateDownloadTokenMock,
}));

import { POST } from "@/app/api/upload-to-cloud/route";

type RateLimitGlobal = typeof globalThis & {
  __neoConvertRateLimitStore?: Map<string, { count: number; resetAt: number }>;
};

function createUploadRequest(options?: {
  file?: File;
  headers?: Record<string, string>;
}) {
  const formData = new FormData();
  if (options?.file) {
    formData.append("file", options.file);
  }

  return new NextRequest("https://neo-convert.site/api/upload-to-cloud", {
    method: "POST",
    headers: {
      host: "neo-convert.site",
      origin: "https://neo-convert.site",
      ...options?.headers,
    },
    body: formData,
  });
}

describe("POST /api/upload-to-cloud", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    uploadMocks.putMock.mockReset();
    uploadMocks.validateDownloadTokenMock.mockReset();
    uploadMocks.validateDownloadTokenMock.mockReturnValue({ valid: true });
    (globalThis as RateLimitGlobal).__neoConvertRateLimitStore?.clear();
    process.env.BLOB_READ_WRITE_TOKEN = "blob-secret";
    delete process.env.neo_READ_WRITE_TOKEN;
  });

  it("rejects invalid download tokens", async () => {
    uploadMocks.validateDownloadTokenMock.mockReturnValue({ valid: false });

    const request = createUploadRequest({
      file: new File(["pdf"], "contract.pdf", {
        type: "application/pdf",
      }),
      headers: {
        "x-download-token": "invalid-token",
      },
    });

    const response = await POST(request);

    expect(uploadMocks.validateDownloadTokenMock).toHaveBeenCalledWith(
      "invalid-token",
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Token de download inválido ou expirado.",
    });
  });

  it("rejects unsupported content types", async () => {
    const request = createUploadRequest({
      file: new File(["bin"], "script.exe", {
        type: "application/octet-stream",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toEqual({
      error: "Tipo de arquivo não permitido.",
    });
  });

  it("returns 503 when blob storage is not configured", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.neo_READ_WRITE_TOKEN;

    const request = createUploadRequest({
      file: new File(["pdf"], "contract.pdf", {
        type: "application/pdf",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Storage indisponível: BLOB_READ_WRITE_TOKEN não configurado.",
    });
  });

  it("falls back to private blob access when public upload is rejected", async () => {
    uploadMocks.putMock
      .mockRejectedValueOnce(
        new uploadMocks.BlobAccessError("public access not allowed"),
      )
      .mockResolvedValueOnce({
        url: "https://files.neo-convert.site/ignored",
        downloadUrl: "https://files.neo-convert.site/download/contract.pdf",
        pathname: "neo/contract.pdf",
        contentType: "application/pdf",
      });

    const request = createUploadRequest({
      file: new File(["pdf"], "../../ contract final!!.pdf", {
        type: "application/pdf",
      }),
      headers: {
        "x-download-token": "valid-token",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      url: "https://files.neo-convert.site/download/contract.pdf",
      pathname: "neo/contract.pdf",
      contentType: "application/pdf",
    });
    expect(uploadMocks.putMock).toHaveBeenNthCalledWith(
      1,
      "contract-final.pdf",
      expect.any(File),
      expect.objectContaining({
        access: "public",
        token: "blob-secret",
      }),
    );
    expect(uploadMocks.putMock).toHaveBeenNthCalledWith(
      2,
      "contract-final.pdf",
      expect.any(File),
      expect.objectContaining({
        access: "private",
        token: "blob-secret",
      }),
    );
  });

  it("prefixes filename with mob- for mobile uploads", async () => {
    uploadMocks.putMock.mockResolvedValueOnce({
      url: "https://files.neo-convert.site/mob-contract.pdf",
      pathname: "neo/mob-contract.pdf",
      contentType: "application/pdf",
    });

    const request = createUploadRequest({
      file: new File(["pdf"], "contract.pdf", {
        type: "application/pdf",
      }),
      headers: {
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(uploadMocks.putMock).toHaveBeenCalledWith(
      "mob-contract.pdf",
      expect.any(File),
      expect.anything(),
    );
  });
});
