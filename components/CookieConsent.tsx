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
          className="cookie-consent-shell"
        >
          <div className="cookie-consent-card">
            <div className="cookie-consent-grid">
              <div>
                <span className="cookie-consent-chip">Privacidade sob controle</span>
                <strong className="cookie-consent-title">
                  Cookies com o mínimo de ruído
                </strong>
                <p className="cookie-consent-copy">
                  Usamos armazenamento local para lembrar sua escolha de cookies, liberar
                  downloads temporários e, com sua permissão, medir uso e performance do
                  produto.
                </p>
              </div>

              <div className="cookie-consent-actions">
                <button
                  type="button"
                  onClick={() => saveConsent("accepted")}
                  className="cookie-consent-primary"
                >
                  Aceitar analíticos
                </button>
                <button
                  type="button"
                  onClick={() => saveConsent("essential")}
                  className="cookie-consent-secondary"
                >
                  Somente essencial
                </button>
                <Link href="/cookies" className="cookie-consent-link">
                  Ver política de cookies
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .cookie-consent-shell {
          position: fixed;
          left: 20px;
          right: 20px;
          bottom: 20px;
          z-index: 120;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }

        .cookie-consent-card {
          width: 100%;
          max-width: 780px;
          padding: 22px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.56);
          background:
            radial-gradient(circle at top left, rgba(255, 255, 255, 0.52), transparent 42%),
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.8) 0%,
              rgba(244, 255, 250, 0.74) 48%,
              rgba(233, 245, 255, 0.76) 100%
            );
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          box-shadow:
            0 24px 60px rgba(5, 16, 20, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.66);
          pointer-events: auto;
          animation: cookieConsentIn 360ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .cookie-consent-grid {
          display: grid;
          gap: 16px;
          align-items: center;
        }

        .cookie-consent-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.38);
          border: 1px solid rgba(16, 32, 39, 0.08);
          color: rgba(16, 32, 39, 0.68);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .cookie-consent-title {
          display: block;
          margin-bottom: 8px;
          font-size: 16px;
          color: #102027;
          letter-spacing: -0.01em;
        }

        .cookie-consent-copy {
          color: rgba(16, 32, 39, 0.78);
          font-size: 13px;
          line-height: 1.75;
          max-width: 56ch;
        }

        .cookie-consent-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .cookie-consent-primary,
        .cookie-consent-secondary {
          border-radius: 999px;
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            background 160ms ease,
            border-color 160ms ease;
        }

        .cookie-consent-primary {
          border: none;
          background: rgba(16, 32, 39, 0.92);
          color: #f6fffb;
          box-shadow: 0 12px 24px rgba(16, 32, 39, 0.18);
        }

        .cookie-consent-secondary {
          background: rgba(255, 255, 255, 0.4);
          border: 1px solid rgba(16, 32, 39, 0.12);
          color: #102027;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .cookie-consent-primary:hover,
        .cookie-consent-secondary:hover {
          transform: translateY(-1px);
        }

        .cookie-consent-link {
          color: rgba(16, 32, 39, 0.66);
          font-size: 13px;
          text-decoration: none;
          white-space: nowrap;
        }

        .cookie-consent-link:hover {
          color: #102027;
        }

        @keyframes cookieConsentIn {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 720px) {
          .cookie-consent-shell {
            left: 12px;
            right: 12px;
            bottom: 12px;
          }

          .cookie-consent-card {
            padding: 18px;
            border-radius: 22px;
          }

          .cookie-consent-title {
            font-size: 15px;
          }

          .cookie-consent-copy {
            font-size: 12px;
            line-height: 1.7;
          }

          .cookie-consent-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .cookie-consent-primary,
          .cookie-consent-secondary,
          .cookie-consent-link {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .cookie-consent-link {
            padding-top: 4px;
            white-space: normal;
          }
        }
      `}</style>
    </>
  );
}
