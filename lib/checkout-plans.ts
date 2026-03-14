export type CheckoutPlanId = "starter" | "pro" | "business";

export interface CheckoutPlan {
  id: CheckoutPlanId;
  name: string;
  checkoutName: string;
  price: string;
  period: string;
  description: string;
  cta: string;
  featured?: boolean;
  badge?: string;
  billingModel: string;
  deliveryWindow: string;
  supportModel: string;
  features: string[];
}

export const CHECKOUT_PLANS: CheckoutPlan[] = [
  {
    id: "starter",
    name: "Unitario",
    checkoutName: "NeoConvert Unitario",
    price: "R$ 7,50",
    period: "/arquivo",
    description: "Pague apenas quando processar",
    cta: "Ver detalhes e pagar",
    billingModel: "Cobranca unitario por operacao concluida, sem recorrencia mensal.",
    deliveryWindow:
      "Liberacao de download apos confirmacao do Pix, com autorizacao temporaria por dispositivo.",
    supportModel:
      "Suporte por email para cobranca, acesso liberado e comportamento operacional do fluxo.",
    features: [
      "Cobranca por operacao",
      "Sem recorrencia mensal",
      "Download liberado apos pagamento",
      "Autorizacao temporaria de download",
      "Suporte por email",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    checkoutName: "NeoConvert Pro",
    price: "R$ 29",
    period: "/mes",
    description: "Para profissionais e freelas",
    cta: "Ver detalhes e assinar",
    featured: true,
    badge: "Mais popular",
    billingModel:
      "Plano comercial mensal exibido no checkout, com cobranca iniciada pela geracao do Pix.",
    deliveryWindow:
      "Acesso comercial vinculado ao email informado no checkout e ao plano selecionado.",
    supportModel:
      "Atendimento comercial e operacional por email para adesao, acesso e ajustes.",
    features: [
      "Arquivos ilimitados",
      "Ate 100 MB por arquivo",
      "Todas as ferramentas",
      "Assinatura eletronica",
      "Historico de 30 dias",
      "Suporte prioritario",
    ],
  },
  {
    id: "business",
    name: "Business",
    checkoutName: "NeoConvert Business",
    price: "R$ 79",
    period: "/mes",
    description: "Para times e empresas",
    cta: "Ver detalhes e contratar",
    billingModel:
      "Plano comercial para operacao em equipe, com cobranca iniciada pela geracao do Pix.",
    deliveryWindow:
      "Habilitacao comercial vinculada ao email informado e ao escopo do plano contratado.",
    supportModel:
      "Atendimento comercial para equipe, operacao recorrente e necessidades de integracao.",
    features: [
      "Tudo do Pro",
      "Ate 500 MB por arquivo",
      "API de integracao",
      "5 usuarios inclusos",
      "Marca personalizada",
      "SLA 99.9%",
    ],
  },
];

export function getCheckoutPlanById(
  planId: string | null | undefined,
): CheckoutPlan {
  return (
    CHECKOUT_PLANS.find((plan) => plan.id === planId) ?? CHECKOUT_PLANS[0]
  );
}
