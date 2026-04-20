import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  turbopack: {
    // Keep Turbopack root portable after repo moves/renames.
    root: process.cwd(),
  },
  async headers() {
    // Content-Security-Policy is set per-request by `proxy.ts` because
    // it embeds a fresh nonce each time. All other static security headers
    // stay here — they apply uniformly to every route, including API routes.
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
