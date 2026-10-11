import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Sitemap généré à partir de la base : seuls les produits et catégories visibles y figurent. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, coffrets] = await Promise.all([
    db.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    db.category.findFirst({ where: { slug: "coffrets-cadeaux", isActive: true }, select: { id: true } }),
  ]);
  const staticPages = ["", "/boutique", "/promotions", "/evenements", "/sur-mesure", "/livraison-retrait", "/a-propos", "/contact", "/faq", "/mentions-legales", "/cgv", "/confidentialite", "/cookies", ...(coffrets ? ["/coffrets"] : [])];
  return [
    ...staticPages.map((p) => ({ url: `${appUrl}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...categories.map((c) => ({ url: `${appUrl}/categorie/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${appUrl}/produit/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
