import { NextRequest } from "next/server";

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    if (!email || email.length > 254) return null;
    if (!SIMPLE_EMAIL_REGEX.test(email)) return null;
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

export function safeFilename(input: string, fallback = "arquivo"): string {
    const extension = input.includes(".") ? input.split(".").pop() ?? "" : "";
    const baseName = input.includes(".")
        ? input.slice(0, input.lastIndexOf("."))
        : input;

    const sanitizedBase = baseName
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 80);

    const safeBase = sanitizedBase || fallback;
    const safeExt = extension
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 10);

    return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

export function resolvePublicAppUrl(value: string | undefined): string {
    const fallback = "https://neo-convert.site";
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
