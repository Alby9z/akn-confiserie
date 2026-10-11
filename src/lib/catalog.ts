import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const PAGE_SIZE = 24;

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  categorie: z.string().max(80).optional().catch(undefined),
  min: z.coerce.number().int().min(0).max(100000).optional().catch(undefined),
  max: z.coerce.number().int().min(0).max(100000).optional().catch(undefined),
  tri: z.enum(["nouveautes", "prix-croissant", "prix-decroissant", "nom"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
  promo: z.enum(["1"]).optional().catch(undefined),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  priceCents: true,
  compareAtPriceCents: true,
  packaging: true,
  netWeightGrams: true,
  stock: true,
  isFeatured: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  images: { orderBy: { position: "asc" }, take: 1, select: { storageKey: true, alt: true } },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

/** Une promotion est « réelle » si un ancien prix supérieur au prix actuel a été saisi. */
export const promoWhere: Prisma.ProductWhereInput = { compareAtPriceCents: { not: null } };

export function isOnPromo(p: { priceCents: number; compareAtPriceCents: number | null }) {
  return p.compareAtPriceCents != null && p.compareAtPriceCents > p.priceCents;
}

export async function getActiveCategories() {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, description: true, _count: { select: { products: { where: { isActive: true } } } } },
  });
}

export async function listProducts(query: CatalogQuery, fixed?: { categorySlug?: string; promoOnly?: boolean }) {
  const page = query.page ?? 1;
  const categorySlug = fixed?.categorySlug ?? query.categorie;
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(categorySlug ? { category: { slug: categorySlug, isActive: true } } : {}),
    ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
    ...(query.min != null || query.max != null
      ? { priceCents: { ...(query.min != null ? { gte: query.min * 100 } : {}), ...(query.max != null ? { lte: query.max * 100 } : {}) } }
      : {}),
    ...(fixed?.promoOnly || query.promo ? promoWhere : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    query.tri === "prix-croissant"
      ? [{ priceCents: "asc" }]
      : query.tri === "prix-decroissant"
        ? [{ priceCents: "desc" }]
        : query.tri === "nom"
          ? [{ name: "asc" }]
          : [{ createdAt: "desc" }];
  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: productCardSelect }),
  ]);
  // Le filtre promo exige aussi ancien prix > prix actuel (non exprimable directement en Prisma)
  const filtered = fixed?.promoOnly || query.promo ? items.filter(isOnPromo) : items;
  return { items: filtered, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: { select: { name: true, slug: true, isActive: true } },
      images: { orderBy: { position: "asc" } },
      related: { include: { to: { select: productCardSelect } } },
    },
  });
}

export async function getFeaturedProducts(limit = 8) {
  return db.product.findMany({ where: { isActive: true, isFeatured: true }, orderBy: { updatedAt: "desc" }, take: limit, select: productCardSelect });
}

export async function getNewProducts(limit = 4) {
  const since = new Date(Date.now() - 45 * 24 * 3600 * 1000);
  return db.product.findMany({ where: { isActive: true, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: limit, select: productCardSelect });
}

export async function getPromoProducts(limit = 4) {
  const items = await db.product.findMany({ where: { isActive: true, ...promoWhere }, orderBy: { updatedAt: "desc" }, take: limit * 2, select: productCardSelect });
  return items.filter(isOnPromo).slice(0, limit);
}
