import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { orderRef } from "@/lib/utils";
import { Badge } from "@/components/ui/feedback";
import { PrintButton } from "@/components/account/print-button";

export const metadata = { title: "Détail de commande" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  // Filtre par propriétaire : une autre cliente obtient une 404, jamais la commande
  const order = await db.order.findFirst({ where: { id, userId: user.id }, include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } } });
  if (!order) notFound();
  const ref = orderRef(order.number);
  return (
    <article className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-reglisse">Commande {ref}</h1>
          <p className="text-sm text-encre-doux">Passée le {order.createdAt.toLocaleDateString("fr-FR")} à {order.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div className="flex items-center gap-3"><Badge tone="laque">{ORDER_STATUS_LABELS[order.status]}</Badge><PrintButton /></div>
      </div>
      <section className="rounded-3xl bg-white p-6" aria-labelledby="articles">
        <h2 id="articles" className="font-display text-xl text-reglisse">Récapitulatif de commande</h2>
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-encre-doux"><tr><th className="pb-2 font-medium">Article</th><th className="pb-2 text-right font-medium">Prix unitaire TTC</th><th className="pb-2 text-right font-medium">Qté</th><th className="pb-2 text-right font-medium">Total TTC</th></tr></thead>
          <tbody className="divide-y divide-guimauve-2">
            {order.items.map((i) => (
              <tr key={i.id}><td className="py-2">{i.productName}{i.packaging ? ` — ${i.packaging}` : ""}</td><td className="py-2 text-right tabular-nums">{formatPrice(i.unitPriceCents)}</td><td className="py-2 text-right">{i.quantity}</td><td className="py-2 text-right tabular-nums">{formatPrice(i.lineTotalCents)}</td></tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt>Sous-total</dt><dd className="tabular-nums">{formatPrice(order.subtotalCents)}</dd></div>
          {order.discountCents > 0 && <div className="flex justify-between"><dt>Réduction {order.couponCode}</dt><dd className="tabular-nums">− {formatPrice(order.discountCents)}</dd></div>}
          <div className="flex justify-between"><dt>{order.fulfillment === "PICKUP" ? "Retrait en boutique" : "Livraison"}</dt><dd className="tabular-nums">{order.shippingCents ? formatPrice(order.shippingCents) : "Gratuit"}</dd></div>
          <div className="flex justify-between border-t border-guimauve-2 pt-2 text-base font-bold"><dt>Total TTC</dt><dd className="tabular-nums">{formatPrice(order.totalCents)}</dd></div>
        </dl>
        <p className="mt-6 text-xs text-encre-doux">Ce récapitulatif ne remplace pas une facture. Pour obtenir une facture, contactez la boutique.</p>
      </section>
      {order.fulfillment === "DELIVERY" && (
        <section className="rounded-3xl bg-white p-6">
          <h2 className="font-display text-xl text-reglisse">Adresse de livraison</h2>
          <p className="mt-2 text-sm leading-relaxed">{order.shipFullName}<br />{order.shipLine1}{order.shipLine2 ? <><br />{order.shipLine2}</> : null}<br />{order.shipPostalCode} {order.shipCity}</p>
        </section>
      )}
      <section className="rounded-3xl bg-white p-6 print:hidden" aria-labelledby="suivi">
        <h2 id="suivi" className="font-display text-xl text-reglisse">Suivi</h2>
        <ol className="mt-3 space-y-2 text-sm">
          {order.statusHistory.filter((h) => h.fromStatus !== h.toStatus).map((h) => (
            <li key={h.id} className="flex gap-3"><span className="w-36 shrink-0 text-encre-doux">{h.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span><span>{ORDER_STATUS_LABELS[h.toStatus]}</span></li>
          ))}
        </ol>
      </section>
    </article>
  );
}
