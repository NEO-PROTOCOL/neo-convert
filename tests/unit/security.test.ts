// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getClientIp,
  isSameOriginRequest,
  normalizeEmail,
  normalizeText,
  safeFilename,
} from "@/lib/security";

describe("security helpers", () => {
  beforeEach(() => {
    delete (globalThis as typeof globalThis & { ip?: string }).ip;
  });

  it("prefers the platform-provided request ip", () => {
    const request = new NextRequest("https://neo-convert.site/api/test");
    Object.defineProperty(request, "ip", {
      value: "203.0.113.10",
      configurable: true,
    });

    expect(getClientIp(request)).toBe("203.0.113.10");
  });

  it("falls back to the last forwarded ip", () => {
    const request = new NextRequest("https://neo-convert.site/api/test", {
      headers: {
        "x-forwarded-for": "198.51.100.1, 198.51.100.9",
      },
    });

    expect(getClientIp(request)).toBe("198.51.100.9");
  });

  it("validates same-origin requests using origin and host", () => {
    const sameOriginRequest = new NextRequest(
      "https://neo-convert.site/api/test",
      {
        headers: {
          origin: "https://neo-convert.site",
          host: "neo-convert.site",
        },
      },
    );
    const foreignRequest = new NextRequest("https://neo-convert.site/api/test", {
      headers: {
        origin: "https://attacker.site",
        host: "neo-convert.site",
      },
    });

    expect(isSameOriginRequest(sameOriginRequest)).toBe(true);
    expect(isSameOriginRequest(foreignRequest)).toBe(false);
  });

  it("normalizes email and rejects invalid values", () => {
    expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com");
    expect(normalizeEmail("invalid-email")).toBeNull();
  });

  it("normalizes text and enforces max length", () => {
    expect(normalizeText("  Neo   Convert  ", 20)).toBe("Neo Convert");
    expect(normalizeText("texto longo demais", 5)).toBeNull();
  });

  it("sanitizes filenames without losing the extension", () => {
    expect(safeFilename("../../ relatorio final!!.PDF")).toBe(
      "relatorio-final.pdf",
    );
    expect(safeFilename("???", "fallback")).toBe("fallback");
  });
});
