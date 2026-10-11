import type { Metadata } from "next";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { PageHeader } from "@/components/shop/page-header";
import { Alert } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { isPaymentConfigured } from "@/lib/stripe";
import { availableFulfillments } from "@/lib/pricing";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Commande et paiement", robots: { index: false } };

export default async function CheckoutPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  if (!isPaymentConfigured() || availableFulfillments(settings).length === 0) {
    return (
      <>
        <PageHeader title="Commande" />
        <div className="container-page max-w-2xl">
          <Alert tone="info" title="La commande en ligne n'est pas encore ouverte">
            Le paiement en ligne ou les modes de retrait/livraison ne sont pas encore configurés. Contactez la boutique{settings.phone ? ` au ${settings.phone}` : ""} pour réserver vos articles.
          </Alert>
          <ButtonLink href="/panier" variant="secondary" className="mt-6">Retour au panier</ButtonLink>
        </div>
      </>
    );
  }
  const address = user ? await db.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] }) : null;
  return (
    <>
      <PageHeader title="Commande et paiement" />
      <div className="container-page">
        <CheckoutForm
          isLoggedIn={Boolean(user)}
          pickupInfo={settings.pickupInfo}
          deliveryInfo={settings.deliveryInfo}
          prefill={{
            email: user?.email,
            firstName: user?.firstName ?? undefined,
            lastName: user?.lastName ?? undefined,
            phone: user?.phone ?? undefined,
            address: address ? { fullName: address.fullName, line1: address.line1, line2: address.line2, postalCode: address.postalCode, city: address.city } : null,
          }}
        />
      </div>
    </>
  );
}
