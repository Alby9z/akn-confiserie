import { requireAdmin } from "@/lib/session";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage, btnCls, btnDangerCls, btnSecondaryCls, inputCls, L, Panel } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { adjustStock, deleteProduct, setRelatedProducts, updateImage, updateProduct, uploadProductImages } from "@/app/admin/_actions/products";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/storage-url";

export const metadata = { title: "Modifier un produit" };

const REASONS = { ORDER_RESERVED: "Commande", ORDER_RELEASED: "Commande annulée", ADMIN_ADJUSTMENT: "Ajustement", REFUND_RESTOCK: "Remise en stock (remboursement)" } as const;

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [product, categories, others] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { images: { orderBy: { position: "asc" } }, related: true, stockMovements: { orderBy: { createdAt: "desc" }, take: 15 } } }),
    db.category.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
    db.product.findMany({ where: { id: { not: id } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();
  const relatedIds = new Set(product.related.map((r) => r.toId));
  return (
    <AdminPage title={product.name} searchParams={await searchParams} actions={product.isActive ? <Link href={`/produit/${product.slug}`} target="_blank" className={btnSecondaryCls}>Voir sur le site</Link> : undefined}>
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <ProductForm product={product} categories={categories} action={updateProduct} />
        <div className="space-y-6">
          <Panel title={`Stock : ${product.stock}`}>
            <form action={adjustStock} className="space-y-3">
              <input type="hidden" name="id" value={product.id} />
              <L label="Quantité à ajouter ou retirer" hint="Ex. : 24 pour une livraison, -2 pour une casse."><input name="delta" type="number" required className={inputCls} /></L>
              <L label="Motif"><input name="note" maxLength={200} placeholder="Réception fournisseur, inventaire…" className={inputCls} /></L>
              <button className={btnCls}>Ajuster le stock</button>
            </form>
            {product.stockMovements.length > 0 && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-medium">Historique des mouvements</summary>
                <ul className="mt-2 space-y-1">
                  {product.stockMovements.map((m) => (
                    <li key={m.id} className="flex justify-between gap-2"><span className="text-slate-500">{m.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} — {REASONS[m.reason]}{m.note ? ` (${m.note})` : ""}</span><span className={m.delta < 0 ? "text-red-700" : "text-emerald-700"}>{m.delta > 0 ? "+" : ""}{m.delta}</span></li>
                  ))}
                </ul>
              </details>
            )}
          </Panel>
          <Panel title="Photos">
            {product.images.length === 0 && <p className="mb-3 text-sm text-amber-700">Aucune photo : un emplacement « Photo à venir » est affiché sur le site.</p>}
            <ul className="space-y-3">
              {product.images.map((img, i) => (
                <li key={img.id} className="rounded-lg border border-slate-200 p-2">
                  <div className="flex gap-3">
                    <Image src={mediaUrl(img.storageKey)} alt={img.alt} width={72} height={72} className="size-18 rounded-md object-cover" />
                    <form action={updateImage} className="flex-1 space-y-1">
                      <input type="hidden" name="imageId" value={img.id} />
                      <input type="hidden" name="op" value="alt" />
                      <label className="text-xs text-slate-600">Description de la photo<input name="alt" defaultValue={img.alt} className={`${inputCls} h-8`} /></label>
                      <button className="text-xs font-semibold underline">Enregistrer</button>
                    </form>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {i > 0 && <form action={updateImage}><input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="op" value="first" /><button className="text-xs underline">Mettre en premier</button></form>}
                    <form action={updateImage}><input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="op" value="delete" /><button className="text-xs text-red-700 underline">Supprimer</button></form>
                  </div>
                </li>
              ))}
            </ul>
            <form action={uploadProductImages} className="mt-4 space-y-2" encType="multipart/form-data">
              <input type="hidden" name="id" value={product.id} />
              <input type="file" name="images" multiple accept="image/jpeg,image/png,image/webp" required className="block w-full text-sm" aria-label="Photos à ajouter" />
              <L label="Description des nouvelles photos" hint="Lue par les lecteurs d'écran et Google."><input name="alt" defaultValue={product.name} className={inputCls} /></L>
              <p className="text-xs text-slate-500">JPG, PNG ou WebP, 5 Mo maximum chacune, 8 photos maximum.</p>
              <button className={btnSecondaryCls}>Ajouter les photos</button>
            </form>
          </Panel>
          <Panel title="Produits complémentaires">
            <form action={setRelatedProducts} className="space-y-3">
              <input type="hidden" name="id" value={product.id} />
              <select name="related" multiple size={Math.min(8, Math.max(3, others.length))} defaultValue={[...relatedIds]} className="w-full rounded-lg border border-slate-300 p-2 text-sm" aria-label="Produits complémentaires (Ctrl+clic pour en choisir plusieurs)">
                {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <p className="text-xs text-slate-500">Ctrl+clic (ou Cmd+clic) pour en sélectionner plusieurs. 8 maximum.</p>
              <button className={btnSecondaryCls}>Enregistrer</button>
            </form>
          </Panel>
          <Panel title="Supprimer">
            <form action={deleteProduct}>
              <input type="hidden" name="id" value={product.id} />
              <p className="mb-3 text-sm text-slate-600">Un produit déjà commandé est désactivé au lieu d&apos;être supprimé, pour conserver l&apos;historique.</p>
              <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" required className="accent-red-700" /> Je confirme la suppression</label>
              <button className={btnDangerCls}>Supprimer le produit</button>
            </form>
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
