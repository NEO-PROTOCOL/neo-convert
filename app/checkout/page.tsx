import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import CheckoutPageClient from "@/components/CheckoutPageClient";
import { getCheckoutPlanById } from "@/lib/checkout-plans";

export const metadata: Metadata = {
  title: "Checkout Seguro | NeoConvert",
  description:
    "Pagina dedicada de checkout com contexto comercial, links legais e cobranca Pix transparente.",
  alternates: {
    canonical: "/checkout",
  },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; session?: string }>;
}) {
  const params = await searchParams;
  const plan = getCheckoutPlanById(params.plan);

  return (
    <>
      <div className="neo-bg-grid" />
      <div className="neo-orb neo-orb-1" />
      <div className="neo-orb neo-orb-2" />
      <div className="glow-line" />

      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />
        <main id="main-content">
          <CheckoutPageClient
            initialPlanId={plan.id}
            initialSessionToken={params.session ?? null}
          />
        </main>
        <Footer />
      </div>
    </>
  );
}
