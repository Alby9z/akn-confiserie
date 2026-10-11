import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { orderRef } from "@/lib/utils";
import { Badge, EmptyState } from "@/components/ui/feedback";

export const metadata = { title: "Mes commandes" };

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await db.order.findMany({ where: { userId: user.id, status: { not: "PENDING_PAYMENT" } }, orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } });
  return (
    <section>
      <h1 className="font-display text-3xl text-reglisse">Mes commandes</h1>
      {orders.length === 0 ? (
        <div className="mt-6"><EmptyState title="Aucune commande" /></div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-guimauve-2 text-encre-doux"><tr><th className="p-4 font-medium">Commande</th><th className="p-4 font-medium">Date</th><th className="p-4 font-medium">Statut</th><th className="p-4 text-right font-medium">Total</th></tr></thead>
            <tbody className="divide-y divide-guimauve-2">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="p-4"><Link href={`/compte/commandes/${o.id}`} className="font-semibold text-laque underline">{orderRef(o.number)}</Link></td>
                  <td className="p-4">{o.createdAt.toLocaleDateString("fr-FR")}</td>
                  <td className="p-4"><Badge>{ORDER_STATUS_LABELS[o.status]}</Badge></td>
                  <td className="p-4 text-right font-semibold tabular-nums">{formatPrice(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
