import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage, btnCls, btnDangerCls, inputCls, L, Panel, Table, Td } from "@/components/admin/ui";
import { Alert } from "@/components/ui/feedback";
import { changeOrderStatus, refundOrder } from "@/app/admin/_actions/orders";
import { db } from "@/lib/db";
import { centsToInput, formatPrice } from "@/lib/money";
import { allowedManualTransitions, ORDER_STATUS_LABELS } from "@/lib/order-status";
import { orderRef } from "@/lib/utils";

export const metadata = { title: "Commande" };

const PAYMENT_LABELS = { PENDING: "En attente", SUCCEEDED: "Réussi", FAILED: "Échoué", CANCELLED: "Annulé", PARTIALLY_REFUNDED: "Remboursé partiellement", REFUNDED: "Remboursé" } as const;

export default async function AdminOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, payments: { include: { refunds: true }, orderBy: { createdAt: "asc" } }, statusHistory: { orderBy: { createdAt: "asc" } }, user: { select: { id: true, email: true } } },
  });
  if (!order) notFound();
  const transitions = allowedManualTransitions(order.status, order.fulfillment);
  const refundable = order.payments.filter((p) => (p.status === "SUCCEEDED" || p.status === "PARTIALLY_REFUNDED") && p.amountCents > p.refundedCents);
  const alerts = order.statusHistory.filter((h) => h.note?.startsWith("ALERTE"));
  const actorIds = [...new Set(order.statusHistory.map((h) => h.actorId).filter(Boolean))] as string[];
  const actors = new Map((await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true } })).map((u) => [u.id, u.email]));
  return (
    <AdminPage title={`Commande ${orderRef(order.number)}`} searchParams={await searchParams} actions={<Link href="/admin/commandes" className="text-sm underline">Retour à la liste</Link>}>
      {alerts.map((a) => <Alert key={a.id} tone="error">{a.note}</Alert>)}
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title={`Articles — ${ORDER_STATUS_LABELS[order.status]}`}>
            <Table head={["Article", "Prix unitaire", "Qté", "Total"]}>
              {order.items.map((i) => (
                <tr key={i.id}><Td>{i.productId ? <Link href={`/admin/produits/${i.productId}`} className="underline">{i.productName}</Link> : i.productName}{i.packaging && <span className="block text-xs text-slate-500">{i.packaging}</span>}</Td><Td className="tabular-nums">{formatPrice(i.unitPriceCents)}</Td><Td>{i.quantity}</Td><Td className="tabular-nums">{formatPrice(i.lineTotalCents)}</Td></tr>
              ))}
            </Table>
            <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><dt>Sous-total</dt><dd>{formatPrice(order.subtotalCents)}</dd></div>
              {order.discountCents > 0 && <div className="flex justify-between"><dt>Réduction ({order.couponCode})</dt><dd>− {formatPrice(order.discountCents)}</dd></div>}
              <div className="flex justify-between"><dt>{order.fulfillment === "PICKUP" ? "Retrait" : "Livraison"}</dt><dd>{formatPrice(order.shippingCents)}</dd></div>
              <div className="flex justify-between font-bold"><dt>Total TTC</dt><dd>{formatPrice(order.totalCents)}</dd></div>
            </dl>
          </Panel>
          <Panel title="Paiements (Stripe)">
            {order.payments.length === 0 ? <p className="text-sm text-slate-500">Aucun paiement initié.</p> : (
              <ul className="space-y-3 text-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="rounded-lg border border-slate-200 p-3">
                    <p><strong>{PAYMENT_LABELS[p.status]}</strong> — {formatPrice(p.amountCents)}{p.refundedCents > 0 && ` (remboursé : ${formatPrice(p.refundedCents)})`}</p>
                    <p className="text-xs text-slate-500">Session {p.stripeCheckoutSessionId}{p.stripePaymentIntentId && ` — Paiement ${p.stripePaymentIntentId}`} — {p.createdAt.toLocaleString("fr-FR")}</p>
                    {p.refunds.map((r) => <p key={r.id} className="mt-1 text-xs">Remboursement {formatPrice(r.amountCents)} — {r.status} — {r.createdAt.toLocaleString("fr-FR")}{r.reason && ` — ${r.reason}`}</p>)}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Historique">
            <ol className="space-y-2 text-sm">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="flex flex-wrap gap-x-3"><span className="text-slate-500">{h.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span><span>{h.fromStatus && h.fromStatus !== h.toStatus ? `${ORDER_STATUS_LABELS[h.fromStatus]} → ` : ""}{ORDER_STATUS_LABELS[h.toStatus]}</span>{h.note && <span className="text-slate-600">— {h.note}</span>}{h.actorId && <span className="text-xs text-slate-400">({actors.get(h.actorId) ?? "admin"})</span>}</li>
              ))}
            </ol>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Client">
            <p className="text-sm leading-relaxed">{order.firstName} {order.lastName}<br /><a href={`mailto:${order.email}`} className="underline">{order.email}</a>{order.phone && <><br /><a href={`tel:${order.phone}`} className="underline">{order.phone}</a></>}</p>
            {order.user && <Link href={`/admin/clients/${order.user.id}`} className="mt-2 block text-sm text-laque underline">Fiche client</Link>}
            {order.fulfillment === "DELIVERY" && <p className="mt-3 text-sm leading-relaxed"><strong>Livraison :</strong><br />{order.shipFullName}<br />{order.shipLine1}{order.shipLine2 && <><br />{order.shipLine2}</>}<br />{order.shipPostalCode} {order.shipCity}</p>}
            {order.customerNote && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm"><strong>Message :</strong> {order.customerNote}</p>}
          </Panel>
          {transitions.length > 0 && (
            <Panel title="Changer le statut">
              <form action={changeOrderStatus} className="space-y-3">
                <input type="hidden" name="id" value={order.id} />
                <L label="Nouveau statut"><select name="to" className={inputCls}>{transitions.map((t) => <option key={t} value={t}>{ORDER_STATUS_LABELS[t]}</option>)}</select></L>
                <L label="Note interne (facultatif)"><input name="note" maxLength={300} className={inputCls} /></L>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked className="accent-laque" /> Prévenir le client par e-mail</label>
                <button className={btnCls}>Mettre à jour</button>
              </form>
            </Panel>
          )}
          {refundable.map((p) => (
            <Panel key={p.id} title="Rembourser">
              <form action={refundOrder} className="space-y-3">
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="paymentId" value={p.id} />
                <L label="Montant (€)" hint={`Maximum ${centsToInput(p.amountCents - p.refundedCents)} €. Vide = totalité restante.`}><input name="amount" inputMode="decimal" className={inputCls} /></L>
                <L label="Motif"><input name="reason" maxLength={200} className={inputCls} /></L>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="restock" className="accent-laque" /> Remettre les articles en stock</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" required className="accent-red-700" /> Je confirme le remboursement</label>
                <button className={btnDangerCls}>Rembourser via Stripe</button>
              </form>
            </Panel>
          ))}
        </div>
      </div>
    </AdminPage>
  );
}
