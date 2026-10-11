import { requireAdmin } from "@/lib/session";
import { AdminPage, btnCls, btnSecondaryCls, inputCls, L, Panel } from "@/components/admin/ui";
import { deleteCategory, moveCategory, saveCategory } from "@/app/admin/_actions/catalog";
import { db } from "@/lib/db";

export const metadata = { title: "Catégories" };

function CategoryFields({ c }: { c?: { id: string; name: string; slug: string; description: string | null; isActive: boolean; seoTitle: string | null; seoDescription: string | null } }) {
  return (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-3 md:grid-cols-2">
        <L label="Nom *"><input name="name" required defaultValue={c?.name} className={inputCls} /></L>
        <L label="Adresse (slug)" hint="Vide = générée automatiquement"><input name="slug" defaultValue={c?.slug} className={inputCls} /></L>
        <L label="Description" className="md:col-span-2"><input name="description" defaultValue={c?.description ?? ""} className={inputCls} /></L>
        <L label="Titre Google"><input name="seoTitle" defaultValue={c?.seoTitle ?? ""} maxLength={70} className={inputCls} /></L>
        <L label="Description Google"><input name="seoDescription" defaultValue={c?.seoDescription ?? ""} maxLength={170} className={inputCls} /></L>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={c?.isActive ?? true} className="accent-laque" /> Visible sur le site</label>
    </>
  );
}

export default async function Categories({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const categories = await db.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return (
    <AdminPage title="Catégories" searchParams={await searchParams}>
      <Panel title="Nouvelle catégorie">
        <form action={saveCategory} className="space-y-3"><CategoryFields /><button className={btnCls}>Créer</button></form>
      </Panel>
      <div className="space-y-3">
        {categories.map((c, i) => (
          <details key={c.id} className="rounded-xl border border-slate-200 bg-white">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
              <span className="font-semibold">{c.name} <span className="text-sm font-normal text-slate-500">— {c._count.products} produit(s){c.isActive ? "" : " — masquée"}</span></span>
              <span className="flex gap-1">
                {i > 0 && <form action={moveCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="up" /><button className="rounded px-2 py-1 text-sm hover:bg-slate-100" aria-label={`Monter ${c.name}`}>↑</button></form>}
                {i < categories.length - 1 && <form action={moveCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="down" /><button className="rounded px-2 py-1 text-sm hover:bg-slate-100" aria-label={`Descendre ${c.name}`}>↓</button></form>}
              </span>
            </summary>
            <div className="border-t border-slate-100 p-4">
              <form action={saveCategory} className="space-y-3"><CategoryFields c={c} /><button className={btnCls}>Enregistrer</button></form>
              <form action={deleteCategory} className="mt-4 flex items-center gap-3"><input type="hidden" name="id" value={c.id} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" required /> Confirmer</label><button className={btnSecondaryCls}>Supprimer</button></form>
            </div>
          </details>
        ))}
      </div>
    </AdminPage>
  );
}
