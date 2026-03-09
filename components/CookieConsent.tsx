"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

type ConsentState = "accepted" | "essential" | null;

const CONSENT_KEY = "neo:cookie-consent:v1";

export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CONSENT_KEY);
      if (stored === "accepted" || stored === "essential") {
        setConsent(stored);
      }
    } catch {
      // Ignore storage failures and default to no consent.
    } finally {
      setHydrated(true);
    }
  }, []);

  const shouldTrack = useMemo(() => consent === "accepted", [consent]);

  const saveConsent = (value: Exclude<ConsentState, null>) => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Ignore storage failures and keep in-memory choice for the session.
    }
    setConsent(value);
  };

  return (
    <>
      {shouldTrack ? (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      ) : null}

      {hydrated && consent === null ? (
        <div
          style={{
            position: "fixed",
            left: 20,
            right: 20,
            bottom: 20,
            zIndex: 120,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 760,
              padding: 18,
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-subtle)",
              background: "rgba(10, 10, 15, 0.95)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 14,
                alignItems: "center",
              }}
            >
              <div>
                <strong style={{ display: "block", marginBottom: 6, fontSize: 14 }}>
                  Cookies com o mínimo de ruído
                </strong>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>
                  Usamos armazenamento local para lembrar sua escolha de cookies, liberar
                  downloads temporários e, com sua permissão, medir uso e performance do
                  produto.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => saveConsent("accepted")}
                >
                  Aceitar analíticos
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => saveConsent("essential")}
                >
                  Somente essencial
                </button>
                <Link
                  href="/cookies"
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  Ver política de cookies
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
