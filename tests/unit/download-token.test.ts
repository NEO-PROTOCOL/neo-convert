// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import {
  createDownloadToken,
  validateDownloadToken,
} from "@/lib/download-token";

type DownloadTokenGlobal = typeof globalThis & {
  __neoConvertDownloadTokens?: Map<
    string,
    {
      correlationID: string;
      planId: string;
      createdAt: number;
      expiresAt: number;
      used: boolean;
    }
  >;
};

describe("download tokens", () => {
  beforeEach(() => {
    // Use a 32+ character secret to meet security requirements
    process.env.DOWNLOAD_TOKEN_SECRET = "test-secret-that-is-at-least-32-characters-long";
    (globalThis as DownloadTokenGlobal).__neoConvertDownloadTokens?.clear();
  });

  it("creates a token that can be validated", () => {
    const token = createDownloadToken("corr-123", "pro");

    expect(validateDownloadToken(token)).toEqual({
      valid: true,
      correlationID: "corr-123",
      planId: "pro",
    });
  });

  it("rejects a tampered token", () => {
    const token = createDownloadToken("corr-123", "pro");
    const [tokenId] = token.split(":");

    expect(validateDownloadToken(`${tokenId}:deadbeefdeadbeef`)).toEqual({
      valid: false,
    });
  });

  it("rejects an expired token", () => {
    const token = createDownloadToken("corr-123", "pro");
    const store = (globalThis as DownloadTokenGlobal).__neoConvertDownloadTokens;
    const entry = store?.get(token);

    if (!entry) {
      throw new Error("Expected token store entry to exist");
    }

    entry.expiresAt = Date.now() - 1;
    store?.set(token, entry);

    expect(validateDownloadToken(token)).toEqual({ valid: false });
  });
});
