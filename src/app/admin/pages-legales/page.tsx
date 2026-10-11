import { requireAdmin } from "@/lib/session";
import { AdminPage, btnCls, inputCls, L, Panel, textareaCls } from "@/components/admin/ui";
import { Alert } from "@/components/ui/feedback";
import { saveLegalPage } from "@/app/admin/_actions/content";
import { db } from "@/lib/db";

export const metadata = { title: "Pages légales" };

export default async function LegalAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const pages = await db.legalPage.findMany({ orderBy: { slug: "asc" } });
  return (
    <AdminPage title="Pages légales" searchParams={await searchParams}>
      <Alert tone="warning" title="À faire valider">
        Ces textes sont des trames à compléter (passages « [À COMPLÉTER] »). Faites-les relire par un professionnel (expert-comptable, juriste) avant de cocher « validée ». Tant qu&apos;une page n&apos;est pas validée, le site l&apos;affiche avec la mention « en cours de validation ».
      </Alert>
      <p className="text-sm text-slate-600">Mise en forme : « ## Titre », « ### Sous-titre », « - élément de liste ». Une ligne vide sépare les paragraphes.</p>
      {pages.map((p) => (
        <Panel key={p.slug} title={`${p.title} — ${p.isValidated ? "validée" : "non validée"}`}>
          <form action={saveLegalPage} className="space-y-3">
            <input type="hidden" name="slug" value={p.slug} />
            <L label="Titre"><input name="title" defaultValue={p.title} className={inputCls} /></L>
            <L label="Contenu"><textarea name="content" rows={18} defaultValue={p.content} className={`${textareaCls} font-mono text-xs`} /></L>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isValidated" defaultChecked={p.isValidated} className="accent-laque" /> Texte relu et validé</label>
            <button className={btnCls}>Enregistrer</button>
          </form>
        </Panel>
      ))}
    </AdminPage>
  );
}
