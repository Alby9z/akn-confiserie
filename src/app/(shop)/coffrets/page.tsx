import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/shop/catalog-view";
import { PageHeader } from "@/components/shop/page-header";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { catalogQuerySchema, getActiveCategories, listProducts } from "@/lib/catalog";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";

/** Page affichée seulement si la catégorie « coffrets-cadeaux » est active. */
const SLUG = "coffrets-cadeaux";

export const metadata: Metadata = {
  title: "Coffrets et compositions gourmandes",
  description: "Coffrets de bonbons et compositions gourmandes à offrir, à Belfort. Créations sur mesure sur demande.",
  alternates: { canonical: "/coffrets" },
};

export default async function CoffretsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cat = await db.category.findFirst({ where: { slug: SLUG, isActive: true } });
  if (!cat) notFound();
  const query = catalogQuerySchema.parse(await searchParams);
  const [categories, result] = await Promise.all([getActiveCategories(), listProducts(query, { categorySlug: SLUG })]);
  return (
    <>
      <PageHeader title="Coffrets et compositions" intro={cat.description ?? "Des coffrets prêts à offrir, et des compositions sur mesure pour vos occasions."}>
        <Breadcrumbs appUrl={appUrl} items={[{ label: "Coffrets" }]} />
      </PageHeader>
      <div className="container-page">
        <CatalogView basePath="/coffrets" query={query} {...result} categories={categories} showCategoryFilter={false} />
        <div className="mt-16 rounded-[2rem] bg-guimauve p-8 text-center">
          <p className="font-display text-2xl text-reglisse">Envie d&apos;un coffret composé pour vous ?</p>
          <ButtonLink href="/sur-mesure" className="mt-4">Demander une composition sur mesure</ButtonLink>
        </div>
      </div>
    </>
  );
}
