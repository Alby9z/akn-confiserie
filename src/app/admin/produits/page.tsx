import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { AdminPage, inputCls, LinkBtn, Table, Td, btnSecondaryCls } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Produits" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; stock?: string; ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = sp.q?.slice(0, 80);
  const where: Prisma.ProductWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(sp.stock === "rupture" ? { stock: { lte: 0 } } : sp.stock === "faible" ? { stock: { gt: 0, lte: 5 } } : {}),
  };
  const products = await db.product.findMany({ where, orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { category: { select: { name: true } }, _count: { select: { images: true } } }, take: 500 });
  return (
    <AdminPage title="Produits et stocks" searchParams={sp} actions={<LinkBtn href="/admin/produits/nouveau">Ajouter un produit</LinkBtn>}>
      <form className="flex flex-wrap gap-2" method="get">
        <label className="sr-only" htmlFor="q">Rechercher</label>
        <input id="q" name="q" defaultValue={q} placeholder="Rechercher un produit" className={`${inputCls} max-w-xs`} />
        <select name="stock" defaultValue={sp.stock ?? ""} className={`${inputCls} max-w-[12rem]`} aria-label="Filtrer par stock">
          <option value="">Tous les stocks</option>
          <option value="faible">Stock faible (≤ 5)</option>
          <option value="rupture">En rupture</option>
        </select>
        <button className={btnSecondaryCls}>Filtrer</button>
      </form>
      {products.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-slate-600">Aucun produit. <Link href="/admin/produits/nouveau" className="font-semibold text-laque underline">Ajouter le premier produit</Link></p>
      ) : (
        <Table head={["Produit", "Catégorie", "Prix TTC", "Stock", "Photos", "État"]}>
          {products.map((p) => (
            <tr key={p.id}>
              <Td><Link href={`/admin/produits/${p.id}`} className="font-semibold text-slate-900 underline">{p.name}</Link>{p.packaging && <span className="block text-xs text-slate-500">{p.packaging}</span>}</Td>
              <Td>{p.category?.name ?? "—"}</Td>
              <Td className="tabular-nums">{formatPrice(p.priceCents)}{p.compareAtPriceCents && p.compareAtPriceCents > p.priceCents ? <span className="ml-1 text-xs text-laque">promo</span> : null}</Td>
              <Td className={p.stock <= 0 ? "font-semibold text-red-700" : p.stock <= 5 ? "font-semibold text-amber-700" : "tabular-nums"}>{p.stock}</Td>
              <Td>{p._count.images || <span className="text-amber-700">0</span>}</Td>
              <Td>{p.isActive ? "Visible" : <span className="text-slate-500">Masqué</span>}{p.isFeatured && <span className="ml-1 text-xs text-or-texte">★ accueil</span>}</Td>
            </tr>
          ))}
        </Table>
      )}
    </AdminPage>
  );
}
