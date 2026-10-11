import type { Metadata } from "next";
import { CatalogView } from "@/components/shop/catalog-view";
import { PageHeader } from "@/components/shop/page-header";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { catalogQuerySchema, getActiveCategories, listProducts } from "@/lib/catalog";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Promotions sur les bonbons",
  description: "Les bonbons et confiseries actuellement en promotion chez AKN Confiserie 90 à Belfort.",
  alternates: { canonical: "/promotions" },
};

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = catalogQuerySchema.parse(await searchParams);
  const [categories, result] = await Promise.all([getActiveCategories(), listProducts(query, { promoOnly: true })]);
  return (
    <>
      <PageHeader title="Promotions" intro="Les prix barrés affichés ici correspondent au prix pratiqué avant la promotion.">
        <Breadcrumbs appUrl={appUrl} items={[{ label: "Promotions" }]} />
      </PageHeader>
      <div className="container-page">
        <CatalogView basePath="/promotions" query={query} {...result} categories={categories} />
      </div>
    </>
  );
}
