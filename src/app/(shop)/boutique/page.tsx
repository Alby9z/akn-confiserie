import type { Metadata } from "next";
import { CatalogView } from "@/components/shop/catalog-view";
import { PageHeader } from "@/components/shop/page-header";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { catalogQuerySchema, getActiveCategories, listProducts } from "@/lib/catalog";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Boutique de bonbons en ligne",
  description: "Tous nos bonbons et confiseries : gélifiés, acidulés, réglisses, sucettes, chocolats et coffrets. Commande en ligne, retrait à Belfort.",
  alternates: { canonical: "/boutique" },
};

export default async function BoutiquePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = catalogQuerySchema.parse(await searchParams);
  const [categories, result] = await Promise.all([getActiveCategories(), listProducts(query)]);
  return (
    <>
      <PageHeader title="La boutique" intro="Toutes nos douceurs, à commander en ligne.">
        <Breadcrumbs appUrl={appUrl} items={[{ label: "Boutique" }]} />
      </PageHeader>
      <div className="container-page">
        <CatalogView basePath="/boutique" query={query} {...result} categories={categories} />
      </div>
    </>
  );
}
