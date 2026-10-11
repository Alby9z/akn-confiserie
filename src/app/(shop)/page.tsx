import Link from "next/link";
import { CalendarHeart, Gift, MapPin, Phone, ShoppingBag, Store } from "lucide-react";
import { Hero } from "@/components/shop/hero";
import { ProductGrid } from "@/components/shop/product-card";
import { StoreMap } from "@/components/shop/store-map";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { JsonLd } from "@/components/seo/json-ld";
import { getActiveCategories, getFeaturedProducts, getNewProducts, getPromoProducts } from "@/lib/catalog";
import { getSettings, googleDirectionsUrl, hasStoreAddress } from "@/lib/settings";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { localBusinessJsonLd } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [settings, categories, featured, promos, news, faqs, productCount] = await Promise.all([
    getSettings(),
    getActiveCategories(),
    getFeaturedProducts(8),
    getPromoProducts(4),
    getNewProducts(4),
    db.faq.findMany({ where: { isPublished: true, showOnHome: true }, orderBy: { position: "asc" }, take: 4 }),
    db.product.count({ where: { isActive: true } }),
  ]);
  const hours = settings.openingHours?.split("\n").map((l) => l.trim()).filter(Boolean) ?? [];
  const steps = [
    { icon: ShoppingBag, title: "Composez votre panier", text: "Parcourez les catégories et ajoutez vos bonbons préférés, au sachet ou à l'unité." },
    { icon: Gift, title: "Payez en ligne", text: "Le paiement par carte est sécurisé par Stripe. Vous recevez une confirmation par e-mail." },
    settings.deliveryEnabled && !settings.pickupEnabled
      ? { icon: Store, title: "Recevez votre commande", text: "Nous préparons votre colis et vous prévenons dès son expédition." }
      : { icon: Store, title: "Retirez à la boutique", text: "Nous vous prévenons par e-mail dès que votre commande est prête, boulevard Joffre." },
  ];

  return (
    <>
      <Hero title={settings.heroTitle} text={settings.heroText} />
      <JsonLd data={localBusinessJsonLd(settings, appUrl)} />

      {categories.length > 0 && (
        <section className="container-page pt-20" aria-labelledby="cat-titre">
          <h2 id="cat-titre" className="font-display text-3xl text-reglisse sm:text-4xl">Nos catégories</h2>
          <ul className="mt-8 flex flex-wrap gap-3">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categorie/${c.slug}`} className="group inline-flex items-center gap-3 rounded-full border-2 border-or/50 bg-white py-2.5 pl-5 pr-3 text-[0.95rem] font-semibold text-reglisse transition-colors hover:border-laque hover:text-laque">
                  {c.name}
                  <span className="rounded-full bg-guimauve px-2 py-0.5 text-xs tabular-nums text-encre-doux group-hover:bg-laque group-hover:text-white">{c._count.products}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-page pt-20" aria-labelledby="sel-titre">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="sel-titre" className="font-display text-3xl text-reglisse sm:text-4xl">La sélection du moment</h2>
          {productCount > 0 && <Link href="/boutique" className="font-semibold text-laque underline underline-offset-4 hover:text-laque-fonce">Voir toute la boutique</Link>}
        </div>
        <div className="mt-8">
          {featured.length > 0 ? (
            <ProductGrid products={featured} />
          ) : news.length > 0 ? (
            <ProductGrid products={news} />
          ) : (
            <EmptyState title="La boutique en ligne se remplit">
              Les premiers bonbons arrivent très bientôt sur le site. En attendant, passez nous voir ou appelez-nous{settings.phone ? ` au ${settings.phone}` : ""}.
            </EmptyState>
          )}
        </div>
      </section>

      {promos.length > 0 && (
        <section className="container-page pt-20" aria-labelledby="promo-titre">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="promo-titre" className="font-display text-3xl text-reglisse sm:text-4xl">En promotion</h2>
            <Link href="/promotions" className="font-semibold text-laque underline underline-offset-4">Toutes les promotions</Link>
          </div>
          <div className="mt-8"><ProductGrid products={promos} /></div>
        </section>
      )}

      {featured.length > 0 && news.length > 0 && (
        <section className="container-page pt-20" aria-labelledby="new-titre">
          <h2 id="new-titre" className="font-display text-3xl text-reglisse sm:text-4xl">Nouveautés</h2>
          <div className="mt-8"><ProductGrid products={news} /></div>
        </section>
      )}

      <section className="mt-24 bg-laque text-white" aria-labelledby="evt-titre">
        <div className="container-page grid gap-10 py-16 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <CalendarHeart className="size-10 text-or-clair" aria-hidden />
            <h2 id="evt-titre" className="mt-4 font-display text-3xl sm:text-4xl">Un anniversaire, un mariage, une fête d&apos;entreprise ?</h2>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/90">
              Sachets personnalisés, bars à bonbons, coffrets sur mesure ou grosses quantités : décrivez votre projet, nous étudions la demande et vous envoyons une proposition chiffrée.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/evenements" variant="gold" size="lg">Demander un devis</ButtonLink>
              <ButtonLink href="/sur-mesure" size="lg" className="border-2 border-white/70 bg-transparent hover:bg-white/10">Grosses commandes</ButtonLink>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3 text-sm font-semibold">
            {["Anniversaires", "Mariages", "Baptêmes", "Événements d'entreprise", "Sachets personnalisés", "Coffrets sur mesure"].map((e) => (
              <li key={e} className="rounded-2xl bg-white/10 px-4 py-3">{e}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page pt-20" aria-labelledby="how-titre">
        <h2 id="how-titre" className="font-display text-3xl text-reglisse sm:text-4xl">Comment commander</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="relative pl-14">
              <span className="absolute left-0 top-0 inline-flex size-10 items-center justify-center rounded-full bg-reglisse font-display text-lg text-or-clair" aria-hidden>{i + 1}</span>
              <h3 className="font-display text-xl text-reglisse">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-encre-doux">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {settings.aboutText && (
        <section className="container-page pt-20" aria-labelledby="about-titre">
          <div className="max-w-3xl">
            <h2 id="about-titre" className="font-display text-3xl text-reglisse sm:text-4xl">La boutique</h2>
            <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-encre">{settings.aboutText}</p>
            <Link href="/a-propos" className="mt-4 inline-block font-semibold text-laque underline underline-offset-4">En savoir plus</Link>
          </div>
        </section>
      )}

      {hasStoreAddress(settings) && (
        <section className="container-page pt-20" aria-labelledby="visit-titre">
          <div className="grid gap-10 rounded-[2.5rem] bg-white p-6 shadow-[0_1px_0_var(--color-guimauve-2)] sm:p-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 id="visit-titre" className="font-display text-3xl text-reglisse sm:text-4xl">Venir à la boutique</h2>
              <p className="mt-5 flex gap-2 text-lg">
                <MapPin className="mt-1 size-5 shrink-0 text-laque" aria-hidden />
                <span>{settings.addressLine}<br />{settings.postalCode} {settings.city}</span>
              </p>
              {settings.phone && (
                <p className="mt-3 flex gap-2 text-lg">
                  <Phone className="mt-1 size-5 shrink-0 text-laque" aria-hidden />
                  <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:text-laque">{settings.phone}</a>
                </p>
              )}
              {hours.length > 0 && (
                <ul className="mt-5 space-y-1 text-encre-doux">
                  {hours.map((h) => <li key={h}>{h}</li>)}
                </ul>
              )}
              <a href={googleDirectionsUrl(settings)} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex h-11 items-center rounded-full bg-reglisse px-5 font-semibold text-white hover:bg-reglisse-2">
                Itinéraire<span className="sr-only"> (nouvel onglet)</span>
              </a>
            </div>
            {settings.mapLatitude != null && settings.mapLongitude != null && (
              <StoreMap query={`${settings.mapLatitude},${settings.mapLongitude}`} title={`Carte : ${settings.shopName}, ${settings.addressLine}, ${settings.city}`} />
            )}
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="container-page pt-20" aria-labelledby="faq-titre">
          <h2 id="faq-titre" className="font-display text-3xl text-reglisse sm:text-4xl">Questions fréquentes</h2>
          <div className="mt-8 max-w-3xl divide-y divide-guimauve-2 border-y border-guimauve-2">
            {faqs.map((f) => (
              <details key={f.id} className="group py-4">
                <summary className="cursor-pointer list-none font-semibold text-reglisse marker:hidden">{f.question}</summary>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-encre-doux">{f.answer}</p>
              </details>
            ))}
          </div>
          <Link href="/faq" className="mt-5 inline-block font-semibold text-laque underline underline-offset-4">Toutes les questions</Link>
        </section>
      )}
    </>
  );
}
