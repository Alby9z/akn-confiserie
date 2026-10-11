import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import { ConfirmationEffects } from "@/components/shop/confirmation-client";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS, PAID_STATUSES } from "@/lib/order-status";
import { sha256 } from "@/lib/security";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { orderRef } from "@/lib/utils";
import { timingSafeEqual } from "node:crypto";

export const metadata: Metadata = { title: "Confirmation de commande", robots: { index: false } };

function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ commande?: string; cle?: string }> }) {
  const { commande, cle } = await searchParams;
  if (!commande || commande.length > 40) notFound();
  const [order, session, settings] = await Promise.all([
    db.order.findUnique({ where: { id: commande }, include: { items: true } }),
    getSession(),
    getSettings(),
  ]);
  if (!order) notFound();
  // Accès : propriétaire connecté, ou détenteur du jeton reçu lors du paiement
  const ownsIt = session && order.userId === session.user.id;
  const hasToken = cle && order.guestTokenHash && safeEqualHex(sha256(cle), order.guestTokenHash);
  if (!ownsIt && !hasToken) notFound();

  const paid = PAID_STATUSES.includes(order.status) || order.status === "REFUNDED";
  const pending = order.status === "PENDING_PAYMENT";
  const ref = orderRef(order.number);

  return (
    <div className="container-page max-w-2xl pt-12">
      <ConfirmationEffects clearCart={order.status !== "CANCELLED"} poll={pending} />
      {paid && (
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-14 text-menthe" aria-hidden />
          <h1 className="mt-4 font-display text-4xl font-semibold text-reglisse">Merci, {order.firstName} !</h1>
          <p className="mt-3 text-lg text-encre-doux">Votre commande <strong className="text-encre">{ref}</strong> est confirmée. Un e-mail récapitulatif vous a été envoyé à {order.email}.</p>
        </div>
      )}
      {pending && (
        <div className="text-center" role="status">
          <Clock className="mx-auto size-14 text-or-texte" aria-hidden />
          <h1 className="mt-4 font-display text-4xl font-semibold text-reglisse">Paiement en cours de confirmation</h1>
          <p className="mt-3 text-lg text-encre-doux">Nous attendons la confirmation de Stripe pour la commande {ref}. Cette page se met à jour automatiquement.</p>
        </div>
      )}
      {order.status === "CANCELLED" && (
        <Alert tone="warning" title={`Commande ${ref} annulée`}>
          Le paiement n&apos;a pas abouti ou la réservation a expiré. Aucun montant n&apos;a été débité pour cette commande. Vous pouvez la repasser depuis votre panier.
        </Alert>
      )}

      <section className="mt-10 rounded-3xl bg-white p-6" aria-labelledby="recap">
        <h2 id="recap" className="font-display text-2xl text-reglisse">Récapitulatif</h2>
        <p className="mt-1 text-sm text-encre-doux">Statut : {ORDER_STATUS_LABELS[order.status]}</p>
        <ul className="mt-4 space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3"><span>{i.productName} × {i.quantity}</span><span className="tabular-nums">{formatPrice(i.lineTotalCents)}</span></li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-guimauve-2 pt-4 text-sm">
          {order.discountCents > 0 && <div className="flex justify-between"><dt>Réduction</dt><dd>− {formatPrice(order.discountCents)}</dd></div>}
          <div className="flex justify-between"><dt>{order.fulfillment === "PICKUP" ? "Retrait en boutique" : "Livraison"}</dt><dd>{order.shippingCents ? formatPrice(order.shippingCents) : "Gratuit"}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>Total TTC</dt><dd>{formatPrice(order.totalCents)}</dd></div>
        </dl>
        {paid && order.fulfillment === "PICKUP" && (
          <p className="mt-5 rounded-2xl bg-guimauve/60 p-4 text-sm">
            Nous vous préviendrons par e-mail quand votre commande sera prête. Retrait au {settings.addressLine}, {settings.postalCode} {settings.city}.
            {settings.pickupInfo ? ` ${settings.pickupInfo}` : ""}
          </p>
        )}
      </section>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {session ? <ButtonLink href={`/compte/commandes/${order.id}`}>Suivre ma commande</ButtonLink> : <ButtonLink href="/inscription" variant="secondary">Créer un compte pour suivre mes commandes</ButtonLink>}
        <ButtonLink href="/boutique" variant="ghost">Continuer mes achats</ButtonLink>
      </div>
    </div>
  );
}
