import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { SECURITY } from "./constants";
import { ensureTursoSchema, getTurso } from "./turso";

/**
 * Name of the HttpOnly cookie that carries the download authorization.
 * Kept in sync with lib/download-token.ts#setDownloadTokenCookie.
 */
export const DOWNLOAD_TOKEN_COOKIE = "neo_download_token";

/**
 * Download token store backed by Turso (libSQL).
 * Tokens expire after SECURITY.TOKEN_TTL_MS and are cleaned up by the daily
 * cron (see lib/turso.ts#cleanupExpiredTurso).
 */

function safeCompareHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
        return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
    } catch {
        return false;
    }
}

const TOKEN_TTL_MS = SECURITY.TOKEN_TTL_MS;

function getSecret(): string {
    const secret = process.env.DOWNLOAD_TOKEN_SECRET;
    if (!secret) {
        throw new Error(
            "DOWNLOAD_TOKEN_SECRET environment variable is required. " +
            "Please set it in your .env.local file for security."
        );
    }
    if (secret.length < SECURITY.MIN_SECRET_LENGTH) {
        throw new Error(
            `DOWNLOAD_TOKEN_SECRET must be at least ${SECURITY.MIN_SECRET_LENGTH} characters long for security.`
        );
    }
    return secret;
}

export async function createDownloadToken(
    correlationID: string,
    planId: string,
): Promise<string> {
    await ensureTursoSchema();
    const client = getTurso();

    const tokenId = randomUUID();
    const hmac = createHmac("sha256", getSecret());
    hmac.update(`${tokenId}:${correlationID}:${planId}`);
    const signature = hmac.digest("hex").slice(0, 16);
    const token = `${tokenId}:${signature}`;

    const now = Date.now();
    await client.execute({
        sql: `INSERT INTO download_tokens
              (token, correlation_id, plan_id, created_at, expires_at, used)
              VALUES (?, ?, ?, ?, ?, 0)`,
        args: [token, correlationID, planId, now, now + TOKEN_TTL_MS],
    });

    return token;
}

export async function validateDownloadToken(
    token: string,
): Promise<{ valid: boolean; correlationID?: string; planId?: string }> {
    if (!token || typeof token !== "string") {
        return { valid: false };
    }

    await ensureTursoSchema();
    const client = getTurso();

    const result = await client.execute({
        sql: `SELECT correlation_id, plan_id, expires_at
              FROM download_tokens WHERE token = ?`,
        args: [token],
    });

    const row = result.rows[0];
    if (!row) return { valid: false };

    const correlationID = String(row.correlation_id);
    const planId = String(row.plan_id);
    const expiresAt = Number(row.expires_at);

    if (expiresAt <= Date.now()) {
        await client.execute({
            sql: "DELETE FROM download_tokens WHERE token = ?",
            args: [token],
        });
        return { valid: false };
    }

    // Verify HMAC
    const parts = token.split(":");
    if (parts.length !== 2) {
        return { valid: false };
    }

    const [tokenId, signature] = parts;
    const hmac = createHmac("sha256", getSecret());
    hmac.update(`${tokenId}:${correlationID}:${planId}`);
    const expectedSignature = hmac.digest("hex").slice(0, 16);

    if (!safeCompareHex(signature, expectedSignature)) {
        await client.execute({
            sql: "DELETE FROM download_tokens WHERE token = ?",
            args: [token],
        });
        return { valid: false };
    }

    return { valid: true, correlationID, planId };
}

/**
 * Extract the download token from the request — cookie first (preferred,
 * HttpOnly so it never leaks to server logs via query strings), then the
 * legacy `x-download-token` header for backward compatibility.
 */
export function readDownloadTokenFromRequest(req: NextRequest): string | null {
    const cookieValue = req.cookies.get(DOWNLOAD_TOKEN_COOKIE)?.value;
    if (cookieValue && cookieValue.length > 0) return cookieValue;

    const header = req.headers.get("x-download-token");
    if (header && header.length > 0) return header;

    return null;
}

/**
 * Cookie options for the download token cookie. HttpOnly + Secure + SameSite=Lax
 * so the cookie survives the top-level navigation from the checkout page back
 * to the tool page (post-redirect), but is not readable by client JS.
 */
export const downloadTokenCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(TOKEN_TTL_MS / 1000),
};
