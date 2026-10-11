import type { Metadata } from "next";
import { Store, Truck } from "lucide-react";
import { PageHeader } from "@/components/shop/page-header";
import { Alert } from "@/components/ui/feedback";
import { getSettings, googleDirectionsUrl, hasStoreAddress } from "@/lib/settings";
import { formatPrice } from "@/lib/money";

export const metadata: Metadata = {
  title: "Livraison et retrait en boutique",
  description: "Retrait en boutique à Belfort et modalités de livraison de vos commandes de bonbons.",
  alternates: { canonical: "/livraison-retrait" },
};

export default async function ShippingPage() {
  const s = await getSettings();
  const deliveryOn = s.deliveryEnabled && s.deliveryFeeCents != null;
  return (
    <>
      <PageHeader title="Livraison et retrait" />
      <div className="container-page grid max-w-5xl gap-8 md:grid-cols-2">
        <section className="rounded-[2rem] bg-white p-7" aria-labelledby="retrait">
          <Store className="size-8 text-laque" aria-hidden />
          <h2 id="retrait" className="mt-3 font-display text-2xl text-reglisse">Retrait en boutique</h2>
          {s.pickupEnabled ? (
            <div className="mt-3 space-y-3 leading-relaxed">
              <p>Gratuit. Nous vous envoyons un e-mail dès que votre commande est prête.</p>
              {hasStoreAddress(s) && <p>{s.addressLine}, {s.postalCode} {s.city} — <a href={googleDirectionsUrl(s)} target="_blank" rel="noopener noreferrer" className="font-semibold text-laque underline">itinéraire</a></p>}
              {s.pickupInfo && <p className="whitespace-pre-line text-encre-doux">{s.pickupInfo}</p>}
            </div>
          ) : (
            <p className="mt-3 text-encre-doux">Le retrait des commandes en ligne n&apos;est pas encore ouvert.</p>
          )}
        </section>
        <section className="rounded-[2rem] bg-white p-7" aria-labelledby="livraison">
          <Truck className="size-8 text-laque" aria-hidden />
          <h2 id="livraison" className="mt-3 font-display text-2xl text-reglisse">Livraison</h2>
          {deliveryOn ? (
            <div className="mt-3 space-y-3 leading-relaxed">
              <p>Frais de livraison : {formatPrice(s.deliveryFeeCents!)}{s.freeDeliveryThresholdCents != null && `, offerts dès ${formatPrice(s.freeDeliveryThresholdCents)} d'achat`}.</p>
              {s.deliveryInfo && <p className="whitespace-pre-line text-encre-doux">{s.deliveryInfo}</p>}
            </div>
          ) : (
            <p className="mt-3 text-encre-doux">La livraison n&apos;est pas proposée pour le moment.</p>
          )}
        </section>
        <Alert tone="info" className="md:col-span-2">Pour les grosses commandes et les événements, les modalités de remise sont définies avec vous dans le devis.</Alert>
      </div>
    </>
  );
}
