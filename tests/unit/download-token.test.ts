// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import {
  createDownloadToken,
  validateDownloadToken,
} from "@/lib/download-token";
import { ensureTursoSchema, getTurso } from "@/lib/turso";

describe("download tokens", () => {
  beforeEach(async () => {
    // Use a 32+ character secret to meet security requirements
    process.env.DOWNLOAD_TOKEN_SECRET = "test-secret-that-is-at-least-32-characters-long";
    await ensureTursoSchema();
    await getTurso().execute("DELETE FROM download_tokens");
  });

  it("creates a token that can be validated", async () => {
    const token = await createDownloadToken("corr-123", "pro");

    expect(await validateDownloadToken(token)).toEqual({
      valid: true,
      correlationID: "corr-123",
      planId: "pro",
    });
  });

  it("rejects a tampered token", async () => {
    const token = await createDownloadToken("corr-123", "pro");
    const [tokenId] = token.split(":");

    expect(await validateDownloadToken(`${tokenId}:deadbeefdeadbeef`)).toEqual({
      valid: false,
    });
  });

  it("rejects an expired token", async () => {
    const token = await createDownloadToken("corr-123", "pro");

    // Force-expire the token in the store
    await getTurso().execute({
      sql: "UPDATE download_tokens SET expires_at = ? WHERE token = ?",
      args: [Date.now() - 1, token],
    });

    expect(await validateDownloadToken(token)).toEqual({ valid: false });
  });
});
