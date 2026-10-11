import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/shop/catalog-view";
import { PageHeader } from "@/components/shop/page-header";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { catalogQuerySchema, getActiveCategories, listProducts } from "@/lib/catalog";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { followRedirect } from "@/lib/redirects";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function getCategory(slug: string) {
  return db.category.findFirst({ where: { slug, isActive: true } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = await getCategory((await params).slug);
  if (!cat) return { title: "Catégorie introuvable" };
  return {
    title: cat.seoTitle || `${cat.name} — bonbons à Belfort`,
    description: cat.seoDescription || cat.description || `${cat.name} : découvrez notre sélection et commandez en ligne, retrait à Belfort.`,
    alternates: { canonical: `/categorie/${cat.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) {
    await followRedirect(`/categorie/${slug}`);
    notFound();
  }
  const query = catalogQuerySchema.parse(await searchParams);
  const [categories, result] = await Promise.all([getActiveCategories(), listProducts(query, { categorySlug: slug })]);
  return (
    <>
      <PageHeader title={cat.name} intro={cat.description}>
        <Breadcrumbs appUrl={appUrl} items={[{ label: "Boutique", href: "/boutique" }, { label: cat.name }]} />
      </PageHeader>
      <div className="container-page">
        <CatalogView basePath={`/categorie/${slug}`} query={query} {...result} categories={categories} showCategoryFilter={false} />
      </div>
    </>
  );
}
