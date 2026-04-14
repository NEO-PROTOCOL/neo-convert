import { NextRequest } from "next/server";
import { EMAIL_REGEX, SECURITY, APP_INFO } from "./constants";

export function getClientIp(req: NextRequest): string {
    // Prefer Vercel's built-in IP detection (not user-spoofable).
    // The `ip` property exists at runtime on Vercel but isn't in the base type.
    const vercelIp = (req as NextRequest & { ip?: string }).ip;
    if (vercelIp) return vercelIp;

    // Fallback: use the LAST (rightmost) IP in X-Forwarded-For,
    // which is the one appended by the infrastructure (not user-controlled).
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const parts = forwardedFor.split(",").map((s) => s.trim()).filter(Boolean);
        const lastIp = parts[parts.length - 1];
        if (lastIp) return lastIp;
    }

    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();

    return "unknown";
}

export function isSameOriginRequest(req: NextRequest): boolean {
    const origin = req.headers.get("origin");
    if (!origin) return true;

    const host = req.headers.get("host");
    if (!host) return false;

    try {
        return new URL(origin).host === host;
    } catch {
        return false;
    }
}

export function normalizeText(input: unknown, maxLength: number): string | null {
    if (typeof input !== "string") return null;
    const normalized = input.trim().replace(/\s+/g, " ");
    if (!normalized || normalized.length > maxLength) return null;
    return normalized;
}

export function normalizeEmail(input: unknown): string | null {
    if (typeof input !== "string") return null;
    const email = input.trim().toLowerCase();
    if (!email || email.length > SECURITY.MAX_EMAIL_LENGTH) return null;
    if (!EMAIL_REGEX.test(email)) return null;
    return email;
}

export function escapeHtml(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function safeFilename(
    input: string,
    fallback: string = APP_INFO.DEFAULT_FILENAME_FALLBACK
): string {
    const extension = input.includes(".") ? input.split(".").pop() ?? "" : "";
    const baseName = input.includes(".")
        ? input.slice(0, input.lastIndexOf("."))
        : input;

    const sanitizedBase = baseName
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, SECURITY.MAX_FILENAME_LENGTH);

    const safeBase = sanitizedBase || fallback;
    const safeExt = extension
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 10);

    return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

export function resolvePublicAppUrl(value: string | undefined): string {
    const fallback = APP_INFO.DEFAULT_URL;
    if (!value) return fallback;

    try {
        const parsed = new URL(value);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return fallback;
        }
        return parsed.toString();
    } catch {
        return fallback;
    }
}

/**
 * Heuristic check if the request comes from a mobile device
 * based on the User-Agent header.
 */
export function isMobileRequest(req: NextRequest): boolean {
    const ua = req.headers.get("user-agent") || "";
    return /iPhone|iPad|iPod|Android|Mobile/i.test(ua);
}
