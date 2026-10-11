import { requireAdmin } from "@/lib/session";
import { AdminPage } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/app/admin/_actions/products";
import { db } from "@/lib/db";

export const metadata = { title: "Nouveau produit" };

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const categories = await db.category.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } });
  return (
    <AdminPage title="Nouveau produit" searchParams={await searchParams}>
      <ProductForm categories={categories} action={createProduct} isNew />
    </AdminPage>
  );
}
