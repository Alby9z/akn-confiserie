import type { Metadata } from "next";
import { CartView } from "@/components/shop/cart-view";
import { PageHeader } from "@/components/shop/page-header";
import { getSettings } from "@/lib/settings";
import { isPaymentConfigured } from "@/lib/stripe";
import { availableFulfillments } from "@/lib/pricing";

export const metadata: Metadata = { title: "Mon panier", robots: { index: false } };

export default async function CartPage({ searchParams }: { searchParams: Promise<{ paiement?: string }> }) {
  const { paiement } = await searchParams;
  const s = await getSettings();
  const checkoutOpen = isPaymentConfigured() && availableFulfillments(s).length > 0;
  return (
    <>
      <PageHeader title="Mon panier" />
      <div className="container-page">
        <CartView cancelled={paiement === "annule"} checkoutOpen={checkoutOpen} />
      </div>
    </>
  );
}
