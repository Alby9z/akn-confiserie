import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { PageHeader } from "@/components/shop/page-header";
import { StoreMap } from "@/components/shop/store-map";
import { ButtonLink } from "@/components/ui/button";
import { getSettings, googleDirectionsUrl, hasStoreAddress } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Coordonnées et accès à la boutique AKN Confiserie 90, 23 boulevard Joffre à Belfort.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const s = await getSettings();
  const hours = s.openingHours?.split("\n").map((l) => l.trim()).filter(Boolean) ?? [];
  return (
    <>
      <PageHeader title="Contact" intro={s.contactName ? `Votre interlocutrice : ${s.contactName}.` : undefined} />
      <div className="container-page grid gap-10 md:grid-cols-2">
        <div className="space-y-6 text-lg">
          {hasStoreAddress(s) && (
            <p className="flex gap-3"><MapPin className="mt-1 size-5 shrink-0 text-laque" aria-hidden /><span>{s.addressLine}<br />{s.postalCode} {s.city}</span></p>
          )}
          {s.phone && <p className="flex gap-3"><Phone className="mt-1 size-5 shrink-0 text-laque" aria-hidden /><a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:text-laque">{s.phone}</a></p>}
          {s.email && <p className="flex gap-3"><Mail className="mt-1 size-5 shrink-0 text-laque" aria-hidden /><a href={`mailto:${s.email}`} className="break-all hover:text-laque">{s.email}</a></p>}
          {hours.length > 0 && (
            <div>
              <h2 className="font-display text-xl text-reglisse">Horaires</h2>
              <ul className="mt-2 space-y-1 text-base text-encre-doux">{hours.map((h) => <li key={h}>{h}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            {hasStoreAddress(s) && <a href={googleDirectionsUrl(s)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center rounded-full bg-reglisse px-5 text-base font-semibold text-white hover:bg-reglisse-2">Itinéraire<span className="sr-only"> (nouvel onglet)</span></a>}
            <ButtonLink href="/sur-mesure" variant="secondary">Faire une demande personnalisée</ButtonLink>
          </div>
        </div>
        {s.mapLatitude != null && s.mapLongitude != null && <StoreMap query={`${s.mapLatitude},${s.mapLongitude}`} title={`Carte : ${s.shopName}`} />}
      </div>
    </>
  );
}
