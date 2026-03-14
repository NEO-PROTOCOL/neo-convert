import { createHmac, randomUUID } from "crypto";
import { SECURITY } from "./constants";

// TODO: Like the rate limiter, this in-memory store resets on cold starts.
// For production, migrate to Vercel KV / Upstash Redis.

interface DownloadToken {
    correlationID: string;
    planId: string;
    createdAt: number;
    expiresAt: number;
    used: boolean;
}

declare global {
    var __neoConvertDownloadTokens: Map<string, DownloadToken> | undefined;
}

const tokens =
    global.__neoConvertDownloadTokens ?? new Map<string, DownloadToken>();
if (!global.__neoConvertDownloadTokens) {
    global.__neoConvertDownloadTokens = tokens;
}

const TOKEN_TTL_MS = SECURITY.TOKEN_TTL_MS;
const MAX_TOKENS = 10_000;

function pruneExpired(): void {
    if (tokens.size <= MAX_TOKENS) return;
    const now = Date.now();
    for (const [id, token] of tokens.entries()) {
        if (token.expiresAt <= now) {
            tokens.delete(id);
        }
    }
}

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

export function createDownloadToken(correlationID: string, planId: string): string {
    pruneExpired();

    const tokenId = randomUUID();
    const hmac = createHmac("sha256", getSecret());
    hmac.update(`${tokenId}:${correlationID}:${planId}`);
    const signature = hmac.digest("hex").slice(0, 16);
    const token = `${tokenId}:${signature}`;

    tokens.set(token, {
        correlationID,
        planId,
        createdAt: Date.now(),
        expiresAt: Date.now() + TOKEN_TTL_MS,
        used: false,
    });

    return token;
}

export function validateDownloadToken(token: string): { valid: boolean; correlationID?: string; planId?: string } {
    if (!token || typeof token !== "string") {
        return { valid: false };
    }

    const entry = tokens.get(token);
    if (!entry) {
        return { valid: false };
    }

    if (entry.expiresAt <= Date.now()) {
        tokens.delete(token);
        return { valid: false };
    }

    // Verify HMAC
    const parts = token.split(":");
    if (parts.length !== 2) {
        return { valid: false };
    }

    const [tokenId, signature] = parts;
    const hmac = createHmac("sha256", getSecret());
    hmac.update(`${tokenId}:${entry.correlationID}:${entry.planId}`);
    const expectedSignature = hmac.digest("hex").slice(0, 16);

    if (signature !== expectedSignature) {
        tokens.delete(token);
        return { valid: false };
    }

    return { valid: true, correlationID: entry.correlationID, planId: entry.planId };
}
