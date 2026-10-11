import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { productCardSelect } from "@/lib/catalog";
import { ProductGrid } from "@/components/shop/product-card";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Mes favoris" };

export default async function FavoritesPage() {
  const user = await requireUser();
  const favs = await db.favorite.findMany({ where: { userId: user.id, product: { isActive: true } }, orderBy: { createdAt: "desc" }, include: { product: { select: productCardSelect } } });
  return (
    <section>
      <h1 className="font-display text-3xl text-reglisse">Mes favoris</h1>
      <div className="mt-6">
        {favs.length ? <ProductGrid products={favs.map((f) => f.product)} /> : <EmptyState title="Pas encore de favoris" action={<ButtonLink href="/boutique">Parcourir la boutique</ButtonLink>}>Ajoutez des produits à vos favoris depuis leur fiche.</EmptyState>}
      </div>
    </section>
  );
}
