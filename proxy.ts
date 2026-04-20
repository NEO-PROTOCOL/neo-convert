import { NextRequest, NextResponse } from "next/server";

/**
 * Per-request CSP proxy (Next.js 16 renamed `middleware.ts` to `proxy.ts`).
 *
 * Generates a fresh nonce on every HTML page request and builds a strict
 * Content-Security-Policy that authorizes only scripts carrying that nonce
 * (plus anything transitively loaded by them, via `strict-dynamic`).
 *
 * Next.js App Router automatically attaches `nonce={x-nonce}` to its own
 * framework scripts when we forward the nonce as a request header — see
 * https://nextjs.org/docs/app/guides/content-security-policy
 *
 * In development, `unsafe-eval` is allowed because Turbopack's HMR client
 * relies on `eval` to hot-swap modules. Production drops `unsafe-eval` and
 * `unsafe-inline` entirely.
 */

const isProd = process.env.NODE_ENV === "production";

function makeNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function buildCsp(nonce: string): string {
  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://vercel.live`
    : `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://vercel.live`;

  return [
    "default-src 'self'",
    scriptSrc,
    // Styled-JSX / Tailwind inject inline <style> blocks at runtime. Allowing
    // 'unsafe-inline' for styles is standard practice and much lower-risk than
    // allowing it for scripts — a style injection cannot execute code.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com https://vercel.live",
    "connect-src 'self' https://api.flowpay.cash https://send.api.mailtrap.io https://*.blob.vercel-storage.com https://vercel.live wss://ws-us3.pusher.com wss://*.pusher.com",
    "frame-src https://vercel.live",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // Upgrade any inadvertent http:// subresource to https:// in production.
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  // 16 random bytes, base64 — plenty of entropy, compact in the header.
  const nonce = makeNonce();
  const csp = buildCsp(nonce);

  // Forward the nonce so server components can read it via `headers()`.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Skip: api routes (serve JSON, not HTML), Next.js internals, and static
    // assets. The CSP only needs to cover HTML documents where <script> tags
    // are executed. API routes have their own per-route security posture.
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
