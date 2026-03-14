"use client";
import { useState } from "react";
import CheckoutModal from "./CheckoutModal";

const PLANS = [
  {
    id: "starter",
    name: "Unitário",
    price: "R$ 7,50",
    period: "/arquivo",
    desc: "Pague apenas quando processar",
    features: [
      "Cobrança por operação",
      "Sem recorrência mensal",
      "Download liberado após pagamento",
      "Autorização de download por 1h",
      "Suporte por email",
    ],
    cta: "Pagar por arquivo",
    href: "#",
    featured: false,
    checkout: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 29",
    period: "/mês",
    desc: "Para profissionais e freelas",
    badge: "Mais popular",
    features: [
      "Arquivos ilimitados",
      "Até 100 MB por arquivo",
      "Todas as ferramentas",
      "Assinatura eletrônica",
      "Histórico de 30 dias",
      "Suporte prioritário",
    ],
    cta: "Assinar Pro",
    href: "#",
    featured: true,
    checkout: true,
  },
  {
    id: "business",
    name: "Business",
    price: "R$ 79",
    period: "/mês",
    desc: "Para times e empresas",
    features: [
      "Tudo do Pro",
      "Até 500 MB por arquivo",
      "API de integração",
      "5 usuários inclusos",
      "Marca personalizada",
      "SLA 99.9%",
    ],
    cta: "Assinar Business",
    href: "#",
    featured: false,
    checkout: true,
  },
];

export default function Pricing() {
  const [modal, setModal] = useState<{
    planId: string;
    planName: string;
    planPrice: string;
  } | null>(null);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
          alignItems: "start",
        }}
      >
        {PLANS.map((plan) => (
          <div
            key={plan.name}
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
                {plan.desc}
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
                marginBottom: 32,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {plan.features.map((f) => (
                <li
                  key={f}
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
                  {f}
                </li>
              ))}
            </ul>

            {plan.checkout ? (
              <button
                id={`plan-${plan.id}-cta`}
                onClick={() =>
                  setModal({
                    planId: plan.id,
                    planName: `NeoConvert ${plan.name}`,
                    planPrice: `${plan.price} ${plan.period}`,
                  })
                }
                className={plan.featured ? "btn-primary" : "btn-secondary"}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {plan.cta}
              </button>
            ) : (
              <a
                href={plan.href}
                className="btn-secondary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                {plan.cta}
              </a>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <CheckoutModal
          isOpen={!!modal}
          onClose={() => setModal(null)}
          planId={modal.planId}
          planName={modal.planName}
          planPrice={modal.planPrice}
        />
      )}
    </>
  );
}
