import Link from "next/link";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { orderRef } from "@/lib/utils";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { REQUEST_STATUS_LABELS } from "@/lib/request-status";

export default async function AccountHome() {
  const user = await requireUser();
  // Rattache les commandes passées sans compte avec la même adresse e-mail (adresse vérifiée)
  if (user.emailVerified) await db.order.updateMany({ where: { userId: null, email: user.email }, data: { userId: user.id } });
  const [orders, requests] = await Promise.all([
    db.order.findMany({ where: { userId: user.id, status: { not: "PENDING_PAYMENT" } }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.customRequest.findMany({ where: { OR: [{ userId: user.id }, { email: user.email }] }, orderBy: { updatedAt: "desc" }, take: 3 }),
  ]);
  const notifications = [
    ...orders.filter((o) => o.status === "READY_FOR_PICKUP").map((o) => ({ key: o.id, text: `Votre commande ${orderRef(o.number)} est prête au retrait.`, href: `/compte/commandes/${o.id}` })),
    ...orders.filter((o) => o.status === "SHIPPED").map((o) => ({ key: o.id, text: `Votre commande ${orderRef(o.number)} a été expédiée.`, href: `/compte/commandes/${o.id}` })),
    ...requests.filter((r) => r.status === "QUOTE_SENT").map((r) => ({ key: r.id, text: `Une proposition vous a été envoyée pour la demande ${r.reference}.`, href: `/compte/demandes` })),
  ];
  return (
    <div className="space-y-10">
      {user.deletionRequestedAt && <Alert tone="warning" title="Suppression de compte demandée">Votre demande du {user.deletionRequestedAt.toLocaleDateString("fr-FR")} est en cours de traitement.</Alert>}
      {notifications.length > 0 && (
        <section aria-labelledby="notif" className="rounded-3xl bg-white p-6">
          <h2 id="notif" className="flex items-center gap-2 font-display text-xl text-reglisse"><Bell className="size-5 text-laque" aria-hidden /> À noter</h2>
          <ul className="mt-3 space-y-2">
            {notifications.map((n) => <li key={n.key}><Link href={n.href} className="hover:text-laque">{n.text}</Link></li>)}
          </ul>
        </section>
      )}
      <section aria-labelledby="recent">
        <div className="flex items-end justify-between">
          <h2 id="recent" className="font-display text-2xl text-reglisse">Dernières commandes</h2>
          <Link href="/compte/commandes" className="text-sm font-semibold text-laque underline">Tout voir</Link>
        </div>
        {orders.length === 0 ? (
          <div className="mt-4"><EmptyState title="Aucune commande pour l'instant" action={<ButtonLink href="/boutique">Découvrir la boutique</ButtonLink>} /></div>
        ) : (
          <ul className="mt-4 divide-y divide-guimauve-2 rounded-3xl bg-white">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/compte/commandes/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-guimauve/40">
                  <span><strong>{orderRef(o.number)}</strong> <span className="text-sm text-encre-doux">— {o.createdAt.toLocaleDateString("fr-FR")}</span></span>
                  <span className="flex items-center gap-3"><Badge>{ORDER_STATUS_LABELS[o.status]}</Badge><span className="font-semibold tabular-nums">{formatPrice(o.totalCents)}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {requests.length > 0 && (
        <section aria-labelledby="req">
          <h2 id="req" className="font-display text-2xl text-reglisse">Mes demandes personnalisées</h2>
          <ul className="mt-4 space-y-2">
            {requests.map((r) => <li key={r.id} className="flex items-center justify-between rounded-2xl bg-white p-4"><span>{r.reference}</span><Badge>{REQUEST_STATUS_LABELS[r.status]}</Badge></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
