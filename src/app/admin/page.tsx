import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { AdminPage, Panel, Stat, Table, Td } from "@/components/admin/ui";
import { Alert } from "@/components/ui/feedback";
import { db } from "@/lib/db";
import { expireStaleOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { orderRef } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { isPaymentConfigured } from "@/lib/stripe";
import { env } from "@/lib/env";
import { availableFulfillments } from "@/lib/pricing";

export const metadata = { title: "Tableau de bord" };

export default async function AdminHome() {
  await requireAdmin();
  await expireStaleOrders();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [revenueAll, revenueMonth, refunds, ordersPaid, toPrepare, pendingPayment, outOfStock, lowStock, newRequests, openRequests, bestSellers, latest, settings, unvalidatedLegal] = await Promise.all([
    db.payment.aggregate({ _sum: { amountCents: true }, where: { status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] } } }),
    db.payment.aggregate({ _sum: { amountCents: true, refundedCents: true }, where: { status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] }, createdAt: { gte: monthStart } } }),
    db.payment.aggregate({ _sum: { refundedCents: true } }),
    db.order.count({ where: { paidAt: { not: null } } }),
    db.order.count({ where: { status: { in: ["PAID", "PREPARING"] } } }),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.product.count({ where: { isActive: true, stock: { lte: 0 } } }),
    db.product.findMany({ where: { isActive: true, stock: { gt: 0, lte: 5 } }, select: { id: true, name: true, stock: true }, orderBy: { stock: "asc" }, take: 8 }),
    db.customRequest.count({ where: { status: "NEW" } }),
    db.customRequest.count({ where: { status: { in: ["NEW", "REVIEWING"] } } }),
    db.orderItem.groupBy({ by: ["productName"], where: { order: { paidAt: { not: null }, status: { not: "REFUNDED" } } }, _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 }),
    db.order.findMany({ where: { status: { not: "PENDING_PAYMENT" } }, orderBy: { createdAt: "desc" }, take: 6 }),
    getSettings(),
    db.legalPage.count({ where: { isValidated: false } }),
  ]);
  const net = (revenueAll._sum.amountCents ?? 0) - (refunds._sum.refundedCents ?? 0);
  const netMonth = (revenueMonth._sum.amountCents ?? 0) - (revenueMonth._sum.refundedCents ?? 0);

  const setup: string[] = [];
  if (!isPaymentConfigured()) setup.push("Paiement Stripe non configuré (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET).");
  if (!env.RESEND_API_KEY) setup.push("Envoi d'e-mails non configuré (RESEND_API_KEY) : aucun e-mail n'est réellement envoyé.");
  if (availableFulfillments(settings).length === 0) setup.push("Aucun mode de retrait ou de livraison activé : la commande en ligne est fermée.");
  if (!settings.openingHours) setup.push("Horaires d'ouverture non renseignés (non affichés sur le site).");
  if (unvalidatedLegal > 0) setup.push(`${unvalidatedLegal} page(s) légale(s) non validée(s).`);

  return (
    <AdminPage title="Tableau de bord">
      {setup.length > 0 && (
        <Alert tone="warning" title="Avant l'ouverture">
          <ul className="list-disc pl-4">{setup.map((s) => <li key={s}>{s}</li>)}</ul>
          <p className="mt-2"><Link href="/admin/contenu" className="font-semibold underline">Ouvrir les paramètres</Link></p>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Chiffre d'affaires encaissé (net)" value={formatPrice(net)} hint={`Ce mois-ci : ${formatPrice(netMonth)} — paiements confirmés par Stripe, remboursements déduits`} />
        <Stat label="Commandes payées" value={ordersPaid} hint={`${pendingPayment} en attente de paiement`} href="/admin/commandes" />
        <Stat label="À préparer" value={toPrepare} hint="Payées ou en préparation" href="/admin/commandes?statut=PAID" />
        <Stat label="Demandes à traiter" value={openRequests} hint={`${newRequests} nouvelle(s)`} href="/admin/demandes" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Dernières commandes">
          {latest.length === 0 ? <p className="text-sm text-slate-500">Aucune commande.</p> : (
            <Table head={["Commande", "Client", "Statut", "Total"]}>
              {latest.map((o) => (
                <tr key={o.id}>
                  <Td><Link href={`/admin/commandes/${o.id}`} className="font-semibold text-laque underline">{orderRef(o.number)}</Link></Td>
                  <Td>{o.firstName} {o.lastName}</Td>
                  <Td>{ORDER_STATUS_LABELS[o.status]}</Td>
                  <Td className="text-right tabular-nums">{formatPrice(o.totalCents)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
        <Panel title="Stocks">
          <p className="text-sm"><strong>{outOfStock}</strong> produit(s) actif(s) en rupture. <Link href="/admin/produits?stock=rupture" className="text-laque underline">Voir</Link></p>
          {lowStock.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {lowStock.map((p) => <li key={p.id} className="flex justify-between"><Link href={`/admin/produits/${p.id}`} className="underline">{p.name}</Link><span className="tabular-nums text-amber-700">{p.stock} restant(s)</span></li>)}
            </ul>
          )}
          <h3 className="mt-6 text-sm font-semibold">Produits les plus vendus</h3>
          {bestSellers.length === 0 ? <p className="mt-1 text-sm text-slate-500">Pas encore de ventes.</p> : (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {bestSellers.map((b) => <li key={b.productName}>{b.productName} — {b._sum.quantity} vendu(s)</li>)}
            </ol>
          )}
        </Panel>
      </div>
    </AdminPage>
  );
}
