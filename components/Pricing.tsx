"use client";
import Link from "next/link";
import { CHECKOUT_PLANS } from "@/lib/checkout-plans";

export default function Pricing() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 24,
        alignItems: "start",
      }}
    >
      {CHECKOUT_PLANS.map((plan) => (
        <div
          key={plan.id}
          className={`pricing-card ${plan.featured ? "featured" : ""}`}
          style={{ position: "relative" }}
        >
          {plan.badge && (
            <div
              style={{
                position: "absolute",
                top: -14,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "4px 16px",
                borderRadius: "var(--radius-full)",
                background: "var(--neo-green)",
                color: "#000",
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: "nowrap",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {plan.badge}
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              {plan.name}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginBottom: 20,
              }}
            >
              {plan.description}
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span
                style={{
                  fontSize: 42,
                  fontWeight: 800,
                  color: plan.featured
                    ? "var(--neo-green)"
                    : "var(--text-primary)",
                }}
              >
                {plan.price}
              </span>
              <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                {plan.period}
              </span>
            </div>
          </div>

          <ul
            style={{
              listStyle: "none",
              marginBottom: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {plan.features.map((feature) => (
              <li
                key={feature}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 14,
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  style={{
                    color: "var(--neo-green)",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <div
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                marginBottom: 6,
              }}
            >
              Modelo comercial
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {plan.billingModel}
            </p>
          </div>

          <Link
            href={`/checkout?plan=${plan.id}`}
            className={plan.featured ? "btn-primary" : "btn-secondary"}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {plan.cta}
          </Link>
        </div>
      ))}
    </div>
  );
}
