import { requireAdmin } from "@/lib/session";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminPage, btnCls, btnSecondaryCls, inputCls, L, Panel, textareaCls } from "@/components/admin/ui";
import { addInternalNote, replyToRequest, setRequestStatus } from "@/app/admin/_actions/requests";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { REQUEST_STATUS_LABELS } from "@/lib/request-status";
import { EVENT_TYPES } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils";

export const metadata = { title: "Demande" };

export default async function AdminRequest({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const r = await db.customRequest.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!r) notFound();
  const rows: [string, React.ReactNode][] = [
    ["Type", EVENT_TYPES[r.eventType]],
    ["Date prévue", r.eventDate?.toLocaleDateString("fr-FR") ?? "—"],
    ["Personnes", r.guestCount ?? "—"],
    ["Quantité", r.quantity ?? "—"],
    ["Budget indicatif", r.budget ?? "—"],
    ["Produits / couleurs", r.preferences ?? "—"],
  ];
  return (
    <AdminPage title={`Demande ${r.reference}`} searchParams={await searchParams} actions={<Link href="/admin/demandes" className="text-sm underline">Retour</Link>}>
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Besoin">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {rows.map(([k, v]) => <div key={k}><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>)}
            </dl>
            <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-4 text-sm leading-relaxed">{r.description}</p>
            {r.attachmentKey && <a href={`/admin/demandes/${r.id}/piece-jointe`} className={`${btnSecondaryCls} mt-4`}>Télécharger la pièce jointe ({r.attachmentName}, {Math.round((r.attachmentSize ?? 0) / 1024)} Ko)</a>}
            {r.quotedAmountCents != null && <p className="mt-4 text-sm"><strong>Dernier devis envoyé :</strong> {formatPrice(r.quotedAmountCents)} TTC</p>}
          </Panel>
          <Panel title="Échanges et notes">
            <ul className="space-y-3">
              {r.messages.map((m) => (
                <li key={m.id} className={cn("rounded-lg p-3 text-sm", m.isInternal ? "border border-dashed border-amber-300 bg-amber-50" : m.author === "ADMIN" ? "bg-pink-50" : "bg-slate-50")}>
                  <p className="text-xs text-slate-500">{m.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} — {m.isInternal ? "Note interne" : m.author === "ADMIN" ? `Réponse envoyée${m.emailSent ? " par e-mail" : " (e-mail NON envoyé)"}` : m.author === "SYSTEM" ? "Système" : "Client"}</p>
                  <p className="mt-1 whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Répondre au client">
            <form action={replyToRequest} className="space-y-3">
              <input type="hidden" name="id" value={r.id} />
              <L label="Message"><textarea name="message" required rows={7} className={textareaCls} defaultValue={`Bonjour ${r.fullName},\n\n`} /></L>
              <L label="Montant proposé TTC (€)" hint="Facultatif. Si renseigné, la demande passe en « Devis envoyé ». La commande n'est jamais validée automatiquement."><input name="quote" inputMode="decimal" className={`${inputCls} max-w-[12rem]`} /></L>
              <button className={btnCls}>Envoyer la réponse par e-mail</button>
            </form>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Client">
            <p className="text-sm leading-relaxed">{r.fullName}<br /><a href={`mailto:${r.email}`} className="underline">{r.email}</a><br /><a href={`tel:${r.phone}`} className="underline">{r.phone}</a></p>
            <p className="mt-2 text-xs text-slate-500">Reçue le {r.createdAt.toLocaleString("fr-FR")}</p>
          </Panel>
          <Panel title={`Statut : ${REQUEST_STATUS_LABELS[r.status]}`}>
            <form action={setRequestStatus} className="space-y-3">
              <input type="hidden" name="id" value={r.id} />
              <select name="status" defaultValue={r.status} className={inputCls} aria-label="Statut">{Object.entries(REQUEST_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <button className={btnSecondaryCls}>Changer le statut</button>
            </form>
          </Panel>
          <Panel title="Note interne">
            <form action={addInternalNote} className="space-y-3">
              <input type="hidden" name="id" value={r.id} />
              <textarea name="body" required className={textareaCls} aria-label="Note interne" placeholder="Visible uniquement dans l'administration" />
              <button className={btnSecondaryCls}>Ajouter la note</button>
            </form>
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
