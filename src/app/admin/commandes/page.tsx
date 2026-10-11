import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { AdminPage, btnSecondaryCls, inputCls, Table, Td } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { orderRef } from "@/lib/utils";
import { orderFilters } from "@/lib/admin-orders";
import { expireStaleOrders } from "@/lib/orders";

export const metadata = { title: "Commandes" };

type SP = { q?: string; statut?: string; du?: string; au?: string; ok?: string; erreur?: string };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  await expireStaleOrders();
  const orders = await db.order.findMany({ where: orderFilters(sp), orderBy: { createdAt: "desc" }, take: 200 });
  const qs = new URLSearchParams(Object.entries({ q: sp.q, statut: sp.statut, du: sp.du, au: sp.au }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <AdminPage title="Commandes" searchParams={sp} actions={<a href={`/admin/commandes/export${qs ? `?${qs}` : ""}`} className={btnSecondaryCls}>Exporter en CSV</a>}>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <input name="q" defaultValue={sp.q} placeholder="N°, nom ou e-mail" aria-label="Recherche" className={`${inputCls} max-w-xs`} />
        <select name="statut" defaultValue={sp.statut ?? ""} aria-label="Statut" className={`${inputCls} max-w-[14rem]`}>
          <option value="">Tous (hors attente de paiement)</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="text-sm">Du <input type="date" name="du" defaultValue={sp.du} className={`${inputCls} w-auto`} /></label>
        <label className="text-sm">Au <input type="date" name="au" defaultValue={sp.au} className={`${inputCls} w-auto`} /></label>
        <button className={btnSecondaryCls}>Filtrer</button>
      </form>
      {orders.length === 0 ? <p className="rounded-xl bg-white p-8 text-center text-slate-600">Aucune commande.</p> : (
        <Table head={["Commande", "Date", "Client", "Mode", "Statut", "Total"]}>
          {orders.map((o) => (
            <tr key={o.id}>
              <Td><Link href={`/admin/commandes/${o.id}`} className="font-semibold text-laque underline">{orderRef(o.number)}</Link></Td>
              <Td className="whitespace-nowrap">{o.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</Td>
              <Td>{o.firstName} {o.lastName}<span className="block text-xs text-slate-500">{o.email}</span></Td>
              <Td>{o.fulfillment === "PICKUP" ? "Retrait" : "Livraison"}</Td>
              <Td>{ORDER_STATUS_LABELS[o.status]}</Td>
              <Td className="text-right tabular-nums">{formatPrice(o.totalCents)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </AdminPage>
  );
}
