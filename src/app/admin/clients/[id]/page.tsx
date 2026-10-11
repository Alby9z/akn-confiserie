import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage, btnDangerCls, inputCls, Panel, Table, Td } from "@/components/admin/ui";
import { Alert } from "@/components/ui/feedback";
import { deleteCustomer } from "@/app/admin/_actions/customers";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { REQUEST_STATUS_LABELS } from "@/lib/request-status";
import { orderRef } from "@/lib/utils";

export const metadata = { title: "Client" };

export default async function Customer({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  // Sélection explicite : aucun mot de passe ni jeton n'est lu
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, role: true, emailVerified: true, marketingOptIn: true, createdAt: true, deletionRequestedAt: true,
      addresses: true,
      orders: { orderBy: { createdAt: "desc" } },
      customRequests: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!user) notFound();
  return (
    <AdminPage title={user.name} searchParams={await searchParams} actions={<Link href="/admin/clients" className="text-sm underline">Retour</Link>}>
      {user.deletionRequestedAt && <Alert tone="warning" title="Suppression demandée">Le client a demandé la suppression de son compte le {user.deletionRequestedAt.toLocaleDateString("fr-FR")}.</Alert>}
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Commandes">
            {user.orders.length === 0 ? <p className="text-sm text-slate-500">Aucune commande.</p> : (
              <Table head={["Commande", "Date", "Statut", "Total"]}>
                {user.orders.map((o) => <tr key={o.id}><Td><Link href={`/admin/commandes/${o.id}`} className="underline">{orderRef(o.number)}</Link></Td><Td>{o.createdAt.toLocaleDateString("fr-FR")}</Td><Td>{ORDER_STATUS_LABELS[o.status]}</Td><Td className="tabular-nums">{formatPrice(o.totalCents)}</Td></tr>)}
              </Table>
            )}
          </Panel>
          <Panel title="Demandes personnalisées">
            {user.customRequests.length === 0 ? <p className="text-sm text-slate-500">Aucune demande.</p> : (
              <ul className="space-y-1 text-sm">{user.customRequests.map((r) => <li key={r.id}><Link href={`/admin/demandes/${r.id}`} className="underline">{r.reference}</Link> — {REQUEST_STATUS_LABELS[r.status]}</li>)}</ul>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Coordonnées">
            <p className="text-sm leading-relaxed"><a href={`mailto:${user.email}`} className="underline">{user.email}</a>{user.emailVerified ? "" : " (non confirmée)"}{user.phone && <><br />{user.phone}</>}</p>
            <p className="mt-2 text-xs text-slate-500">Inscrit le {user.createdAt.toLocaleDateString("fr-FR")} — e-mails d&apos;information : {user.marketingOptIn ? "acceptés" : "refusés"}</p>
            {user.addresses.map((a) => <p key={a.id} className="mt-3 text-sm">{a.fullName}<br />{a.line1}<br />{a.postalCode} {a.city}</p>)}
          </Panel>
          {user.role !== "ADMIN" && (
            <Panel title="Supprimer le compte">
              <form action={deleteCustomer} className="space-y-3">
                <input type="hidden" name="id" value={user.id} />
                <p className="text-sm text-slate-600">Efface le compte, ses adresses, favoris et sessions. Les commandes restent archivées (sans lien avec le compte) pour les obligations comptables.</p>
                <input name="confirm" placeholder="Tapez SUPPRIMER" aria-label="Confirmation" className={inputCls} />
                <button className={btnDangerCls}>Supprimer définitivement</button>
              </form>
            </Panel>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
