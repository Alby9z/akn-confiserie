import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import type { Settings } from "@/lib/settings";
import { googleDirectionsUrl, hasStoreAddress } from "@/lib/settings";
import { ConsentLink } from "./consent";

export function Footer({ settings }: { settings: Settings }) {
  const hours = settings.openingHours?.split("\n").map((l) => l.trim()).filter(Boolean) ?? [];
  return (
    <footer className="mt-24 bg-reglisse text-guimauve">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl text-white">
            AKN <span className="text-or-clair">Confiserie 90</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-guimauve/80">Bonbons, confiseries et compositions gourmandes à Belfort.</p>
          <div className="mt-4 flex gap-2">
            {settings.instagramUrl && (
              <a href={settings.instagramUrl} rel="noopener noreferrer" target="_blank" className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
                Instagram<span className="sr-only"> (nouvel onglet)</span>
              </a>
            )}
            {settings.facebookUrl && (
              <a href={settings.facebookUrl} rel="noopener noreferrer" target="_blank" className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
                Facebook<span className="sr-only"> (nouvel onglet)</span>
              </a>
            )}
          </div>
        </div>
        <div>
          <h2 className="font-display text-lg text-white">Nous trouver</h2>
          <ul className="mt-3 space-y-2.5 text-sm">
            {hasStoreAddress(settings) && (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-or-clair" aria-hidden />
                <a href={googleDirectionsUrl(settings)} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  {settings.addressLine}
                  <br />
                  {settings.postalCode} {settings.city}
                  <span className="sr-only"> (itinéraire, nouvel onglet)</span>
                </a>
              </li>
            )}
            {settings.phone && (
              <li className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-or-clair" aria-hidden />
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:text-white">{settings.phone}</a>
              </li>
            )}
            {settings.email && (
              <li className="flex gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-or-clair" aria-hidden />
                <a href={`mailto:${settings.email}`} className="break-all hover:text-white">{settings.email}</a>
              </li>
            )}
          </ul>
          {hours.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold text-white">Horaires</h3>
              <ul className="mt-1.5 space-y-1 text-sm">
                {hours.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div>
          <h2 className="font-display text-lg text-white">Commander</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/boutique" className="hover:text-white">Toute la boutique</Link></li>
            <li><Link href="/promotions" className="hover:text-white">Promotions</Link></li>
            <li><Link href="/evenements" className="hover:text-white">Anniversaires et événements</Link></li>
            <li><Link href="/sur-mesure" className="hover:text-white">Grosses commandes et sur mesure</Link></li>
            <li><Link href="/livraison-retrait" className="hover:text-white">Livraison et retrait</Link></li>
            <li><Link href="/faq" className="hover:text-white">Questions fréquentes</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-lg text-white">Informations</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/a-propos" className="hover:text-white">La boutique</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link></li>
            <li><Link href="/cgv" className="hover:text-white">Conditions générales de vente</Link></li>
            <li><Link href="/confidentialite" className="hover:text-white">Politique de confidentialité</Link></li>
            <li><Link href="/cookies" className="hover:text-white">Politique de cookies</Link></li>
            <li><ConsentLink className="text-left hover:text-white" /></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-xs text-guimauve/70">© {new Date().getFullYear()} {settings.shopName}. Paiement sécurisé par Stripe.</p>
      </div>
    </footer>
  );
}
