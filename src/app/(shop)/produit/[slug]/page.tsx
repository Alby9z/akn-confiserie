import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { Gallery } from "@/components/shop/gallery";
import { Price } from "@/components/shop/price";
import { AddToCartButton } from "@/components/shop/add-to-cart";
import { ProductGrid } from "@/components/shop/product-card";
import { FavoriteButton } from "@/components/shop/favorite-button";
import { JsonLd } from "@/components/seo/json-ld";
import { getProductBySlug, isOnPromo } from "@/lib/catalog";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { getSession } from "@/lib/session";
import { mediaUrl } from "@/lib/storage-url";
import { followRedirect } from "@/lib/redirects";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Produit introuvable" };
  const description = p.seoDescription || p.description.slice(0, 155) || `${p.name} — à commander en ligne chez AKN Confiserie 90, Belfort.`;
  return {
    title: p.seoTitle || p.name,
    description,
    alternates: { canonical: `/produit/${p.slug}` },
    openGraph: { title: p.name, description, ...(p.images[0] ? { images: [{ url: mediaUrl(p.images[0].storageKey), alt: p.images[0].alt }] } : {}) },
  };
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-guimauve-2 py-4">
      <h3 className="font-semibold text-reglisse">{title}</h3>
      <div className="mt-1.5 whitespace-pre-line text-[0.95rem] leading-relaxed text-encre-doux">{children}</div>
    </div>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    await followRedirect(`/produit/${slug}`);
    notFound();
  }
  const session = await getSession();
  const isFav = session ? Boolean(await db.favorite.findUnique({ where: { userId_productId: { userId: session.user.id, productId: product.id } } })) : false;
  const related = product.related.map((r) => r.to).filter((p) => p.stock >= 0);
  const hasFoodInfo = product.ingredients || product.allergens || product.mayContain || product.nutrition || product.storageInfo || product.origin;

  const crumbs = [
    { label: "Boutique", href: "/boutique" },
    ...(product.category?.isActive ? [{ label: product.category.name, href: `/categorie/${product.category.slug}` }] : []),
    { label: product.name },
  ];

  return (
    <div className="container-page pt-8">
      <Breadcrumbs appUrl={appUrl} items={crumbs} />
      <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-14">
        <Gallery images={product.images.map((i) => ({ storageKey: i.storageKey, alt: i.alt }))} name={product.name} />
        <div>
          {product.category && <p className="text-sm font-semibold text-or-texte">{product.category.name}</p>}
          <h1 className="mt-1 font-display text-4xl font-semibold text-reglisse">{product.name}</h1>
          {product.packaging && <p className="mt-2 text-lg text-encre-doux">{product.packaging}</p>}
          <Price priceCents={product.priceCents} compareAtPriceCents={product.compareAtPriceCents} netWeightGrams={product.netWeightGrams} size="lg" className="mt-5" />
          <p className="mt-1 text-xs text-encre-doux">Prix TTC{isOnPromo(product) ? " — promotion en cours" : ""}</p>
          <div className="mt-7">
            <AddToCartButton productId={product.id} stock={product.stock} name={product.name} />
          </div>
          {session && <div className="mt-4"><FavoriteButton productId={product.id} initial={isFav} /></div>}
          {product.description && <p className="mt-8 whitespace-pre-line text-lg leading-relaxed">{product.description}</p>}

          <section className="mt-8" aria-labelledby="infos-alim">
            <h2 id="infos-alim" className="font-display text-2xl text-reglisse">Informations alimentaires</h2>
            {hasFoodInfo ? (
              <div className="mt-2">
                {product.ingredients && <InfoBlock title="Ingrédients">{product.ingredients}</InfoBlock>}
                {product.allergens && <InfoBlock title="Allergènes">{product.allergens}</InfoBlock>}
                {product.mayContain && <InfoBlock title="Peut contenir des traces de">{product.mayContain}</InfoBlock>}
                {product.nutrition && <InfoBlock title="Valeurs nutritionnelles">{product.nutrition}</InfoBlock>}
                {product.storageInfo && <InfoBlock title="Conservation">{product.storageInfo}</InfoBlock>}
                {product.origin && <InfoBlock title="Origine">{product.origin}</InfoBlock>}
              </div>
            ) : null}
            <p className="mt-3 rounded-2xl bg-guimauve/70 p-4 text-sm leading-relaxed">
              {hasFoodInfo
                ? "Informations transmises par le fournisseur. En cas d'allergie, vérifiez l'étiquette du produit ou interrogez-nous avant de consommer."
                : "Les informations sur la composition et les allergènes de ce produit ne sont pas encore renseignées en ligne. Contactez la boutique avant de commander si vous avez une allergie ou une intolérance."}
            </p>
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related-titre">
          <h2 id="related-titre" className="font-display text-3xl text-reglisse">Pour compléter votre commande</h2>
          <div className="mt-8"><ProductGrid products={related.slice(0, 4)} /></div>
        </section>
      )}

      <p className="mt-16 text-sm text-encre-doux">
        Une quantité importante ou un emballage personnalisé ? <Link href="/sur-mesure" className="font-semibold text-laque underline">Faites une demande sur mesure</Link>.
      </p>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          ...(product.description ? { description: product.description } : {}),
          ...(product.images.length ? { image: product.images.map((i) => `${appUrl}${mediaUrl(i.storageKey)}`) } : {}),
          ...(product.category ? { category: product.category.name } : {}),
          offers: {
            "@type": "Offer",
            url: `${appUrl}/produit/${product.slug}`,
            priceCurrency: "EUR",
            price: (product.priceCents / 100).toFixed(2),
            availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
          },
        }}
      />
    </div>
  );
}
