import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog";
import { isOnPromo } from "@/lib/catalog";
import { Price } from "./price";
import { ProductImage } from "./product-image";
import { AddToCartButton } from "./add-to-cart";

export function ProductCard({ product, priority }: { product: ProductCardData; priority?: boolean }) {
  const promo = isOnPromo(product);
  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-drop)] bg-guimauve">
        <ProductImage image={product.images[0]} name={product.name} sizes="(min-width:1024px) 22vw, (min-width:640px) 30vw, 46vw" priority={priority} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {promo && <span className="rounded-full bg-laque px-2.5 py-1 text-xs font-bold text-white">Promo</span>}
          {product.stock <= 0 && <span className="rounded-full bg-reglisse px-2.5 py-1 text-xs font-bold text-white">Rupture</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col pt-3">
        {product.category && <p className="text-xs font-medium text-or-texte">{product.category.name}</p>}
        <h3 className="mt-0.5 font-display text-lg leading-snug text-reglisse">
          <Link href={`/produit/${product.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        {product.packaging && <p className="text-sm text-encre-doux">{product.packaging}</p>}
        <Price priceCents={product.priceCents} compareAtPriceCents={product.compareAtPriceCents} netWeightGrams={product.netWeightGrams} className="mt-2" />
        <div className="relative z-10 mt-auto pt-3">
          <AddToCartButton productId={product.id} stock={product.stock} name={product.name} compact />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
