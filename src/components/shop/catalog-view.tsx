import Link from "next/link";
import { ProductGrid } from "./product-card";
import { EmptyState } from "@/components/ui/feedback";
import type { CatalogQuery, ProductCardData } from "@/lib/catalog";

type Cat = { name: string; slug: string };

function buildHref(base: string, q: CatalogQuery, patch: Partial<CatalogQuery>) {
  const merged = { ...q, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v != null && v !== "" && !(k === "page" && v === 1)) params.set(k, String(v));
  const s = params.toString();
  return s ? `${base}?${s}` : base;
}

/** Filtres par formulaire GET : fonctionnent sans JavaScript et produisent des URL partageables. */
export function CatalogView({
  basePath,
  query,
  items,
  total,
  page,
  pages,
  categories,
  showCategoryFilter = true,
}: {
  basePath: string;
  query: CatalogQuery;
  items: ProductCardData[];
  total: number;
  page: number;
  pages: number;
  categories: Cat[];
  showCategoryFilter?: boolean;
}) {
  const hasFilters = Boolean(query.q || query.min != null || query.max != null || query.categorie || query.promo);
  return (
    <div className="grid gap-10 lg:grid-cols-[15rem_1fr]">
      <aside aria-label="Filtres">
        <form method="get" action={basePath} className="space-y-5 rounded-3xl bg-white p-5 lg:sticky lg:top-24">
          <div>
            <label htmlFor="f-q" className="text-sm font-semibold">Rechercher</label>
            <input id="f-q" name="q" defaultValue={query.q ?? ""} maxLength={80} placeholder="Nom du bonbon" className="mt-1.5 h-11 w-full rounded-xl border border-guimauve-2 px-3 focus:border-laque focus:outline-none focus:ring-2 focus:ring-laque/25" />
          </div>
          {showCategoryFilter && categories.length > 0 && (
            <div>
              <label htmlFor="f-cat" className="text-sm font-semibold">Catégorie</label>
              <select id="f-cat" name="categorie" defaultValue={query.categorie ?? ""} className="mt-1.5 h-11 w-full rounded-xl border border-guimauve-2 bg-white px-3 focus:border-laque focus:outline-none">
                <option value="">Toutes</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <fieldset>
            <legend className="text-sm font-semibold">Prix (€)</legend>
            <div className="mt-1.5 flex items-center gap-2">
              <label htmlFor="f-min" className="sr-only">Prix minimum en euros</label>
              <input id="f-min" name="min" type="number" min={0} inputMode="numeric" defaultValue={query.min ?? ""} placeholder="Min" className="h-11 w-full rounded-xl border border-guimauve-2 px-3 focus:border-laque focus:outline-none" />
              <span aria-hidden>–</span>
              <label htmlFor="f-max" className="sr-only">Prix maximum en euros</label>
              <input id="f-max" name="max" type="number" min={0} inputMode="numeric" defaultValue={query.max ?? ""} placeholder="Max" className="h-11 w-full rounded-xl border border-guimauve-2 px-3 focus:border-laque focus:outline-none" />
            </div>
          </fieldset>
          <div>
            <label htmlFor="f-tri" className="text-sm font-semibold">Trier par</label>
            <select id="f-tri" name="tri" defaultValue={query.tri ?? "nouveautes"} className="mt-1.5 h-11 w-full rounded-xl border border-guimauve-2 bg-white px-3 focus:border-laque focus:outline-none">
              <option value="nouveautes">Nouveautés</option>
              <option value="prix-croissant">Prix croissant</option>
              <option value="prix-decroissant">Prix décroissant</option>
              <option value="nom">Nom (A → Z)</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <button type="submit" className="h-11 rounded-full bg-laque font-semibold text-white hover:bg-laque-fonce">Appliquer</button>
            {hasFilters && <Link href={basePath} className="text-center text-sm font-medium text-encre-doux underline underline-offset-2">Effacer les filtres</Link>}
          </div>
        </form>
      </aside>
      <div>
        <p className="mb-6 text-sm text-encre-doux" aria-live="polite">
          {total} produit{total > 1 ? "s" : ""}
          {query.q ? ` pour « ${query.q} »` : ""}
        </p>
        {items.length > 0 ? (
          <ProductGrid products={items} />
        ) : (
          <EmptyState title={hasFilters ? "Aucun bonbon ne correspond" : "Aucun produit pour le moment"} action={hasFilters ? <Link href={basePath} className="font-semibold text-laque underline">Effacer les filtres</Link> : undefined}>
            {hasFilters ? "Essayez un autre mot ou élargissez la fourchette de prix." : "Cette sélection sera bientôt garnie."}
          </EmptyState>
        )}
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
            {page > 1 && <Link href={buildHref(basePath, query, { page: page - 1 })} className="rounded-full border-2 border-guimauve-2 px-4 py-2 font-semibold hover:border-laque">Précédent</Link>}
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === pages)
              .map((p) => (
                <Link key={p} href={buildHref(basePath, query, { page: p })} aria-current={p === page ? "page" : undefined} className={p === page ? "inline-flex size-10 items-center justify-center rounded-full bg-reglisse font-semibold text-white" : "inline-flex size-10 items-center justify-center rounded-full hover:bg-guimauve"}>
                  {p}
                </Link>
              ))}
            {page < pages && <Link href={buildHref(basePath, query, { page: page + 1 })} className="rounded-full border-2 border-guimauve-2 px-4 py-2 font-semibold hover:border-laque">Suivant</Link>}
          </nav>
        )}
      </div>
    </div>
  );
}
