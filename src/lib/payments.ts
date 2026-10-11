import "server-only";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { markOrderPaid, releasePendingOrder, restock } from "@/lib/orders";
import { notifyAdmin, sendEmail } from "@/lib/email/send";
import { adminNewOrderEmail, orderConfirmationEmail } from "@/lib/email/templates";
import { orderRef } from "@/lib/utils";

const CHECKOUT_TTL_SECONDS = 30 * 60; // minimum autorisé par Stripe

/** Crée la session Stripe Checkout à partir des montants enregistrés en base. */
export async function createCheckoutSession(orderId: string, guestToken: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "payment_not_configured" };
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  const ref = orderRef(order.number);
  try {
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (order.discountCents > 0) {
      const coupon = await stripe.coupons.create(
        { amount_off: order.discountCents, currency: "eur", duration: "once", max_redemptions: 1, name: `Réduction ${order.couponCode ?? ""}`.trim() },
        { idempotencyKey: `coupon-${order.id}` },
      );
      discounts = [{ coupon: coupon.id }];
    }
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        locale: "fr",
        customer_email: order.email,
        client_reference_id: order.id,
        metadata: { orderId: order.id, orderRef: ref },
        payment_intent_data: { metadata: { orderId: order.id, orderRef: ref } },
        line_items: order.items.map((i) => ({
          quantity: i.quantity,
          price_data: {
            currency: "eur",
            unit_amount: i.unitPriceCents,
            product_data: { name: i.packaging ? `${i.productName} — ${i.packaging}` : i.productName },
          },
        })),
        discounts,
        shipping_options:
          order.fulfillment === "DELIVERY"
            ? [{ shipping_rate_data: { type: "fixed_amount", display_name: "Livraison", fixed_amount: { amount: order.shippingCents, currency: "eur" } } }]
            : undefined,
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
        success_url: `${appUrl}/commande/confirmation?commande=${order.id}&cle=${encodeURIComponent(guestToken)}`,
        cancel_url: `${appUrl}/panier?paiement=annule`,
      },
      { idempotencyKey: `checkout-${order.id}` },
    );
    await db.payment.create({
      data: { orderId: order.id, stripeCheckoutSessionId: session.id, amountCents: order.totalCents, status: "PENDING" },
    });
    if (!session.url) throw new Error("Session Stripe sans URL");
    return { ok: true, url: session.url };
  } catch (e) {
    console.error("[stripe] création de session échouée", e instanceof Error ? e.message : e);
    await releasePendingOrder(order.id, "Échec de création du paiement");
    return { ok: false, error: "stripe_error" };
  }
}

async function sendPaidEmails(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  const ref = orderRef(order.number);
  const data = {
    ref,
    firstName: order.firstName,
    items: order.items,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    fulfillment: order.fulfillment,
  };
  const customerUrl = order.userId ? `${appUrl}/compte/commandes/${order.id}` : `${appUrl}/connexion`;
  await sendEmail({ to: order.email, ...orderConfirmationEmail({ ...data, url: customerUrl }), template: "order_confirmation" });
  await notifyAdmin({
    ...adminNewOrderEmail({ ...data, url: `${appUrl}/admin/commandes/${order.id}`, customer: `${order.firstName} ${order.lastName}`, email: order.email }),
    template: "admin_new_order",
  });
}

/**
 * Traitement idempotent d'un événement Stripe déjà vérifié (signature contrôlée par l'appelant).
 * L'enregistrement de l'événement et ses effets sont dans la même transaction :
 * un événement rejoué ou reçu deux fois n'a aucun effet supplémentaire.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<"processed" | "duplicate" | "ignored"> {
  const already = await db.stripeEvent.findUnique({ where: { id: event.id } });
  if (already) return "duplicate";

  let paidOrderId: string | null = null;
  let toRelease: { orderId: string; note: string } | null = null;

  const result = await db.$transaction(async (tx) => {
    try {
      await tx.stripeEvent.create({ data: { id: event.id, type: event.type } });
    } catch {
      return "duplicate" as const; // traité en parallèle par une autre requête
    }
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object as Stripe.Checkout.Session;
        const orderId = s.metadata?.orderId ?? s.client_reference_id;
        if (!orderId) return "ignored" as const;
        if (s.payment_status !== "paid") return "processed" as const; // paiement différé : on attend async_payment_succeeded
        if (s.currency !== "eur") return "ignored" as const;
        const pi = typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null);
        const r = await markOrderPaid(tx, { orderId, sessionId: s.id, paymentIntentId: pi, amountCents: s.amount_total ?? -1 });
        if (r === "paid") paidOrderId = orderId;
        return "processed" as const;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const orderId = s.metadata?.orderId ?? s.client_reference_id;
        if (!orderId) return "ignored" as const;
        await tx.payment.updateMany({
          where: { stripeCheckoutSessionId: s.id, status: "PENDING" },
          data: { status: event.type === "checkout.session.expired" ? "CANCELLED" : "FAILED" },
        });
        toRelease = { orderId, note: event.type === "checkout.session.expired" ? "Session de paiement expirée" : "Paiement refusé" };
        return "processed" as const;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (!pi) return "ignored" as const;
        const payment = await tx.payment.findUnique({ where: { stripePaymentIntentId: pi }, include: { order: true } });
        if (!payment) return "ignored" as const;
        const full = charge.amount_refunded >= payment.amountCents;
        await tx.payment.update({
          where: { id: payment.id },
          data: { refundedCents: charge.amount_refunded, status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" },
        });
        if (full && payment.order.status !== "REFUNDED") {
          await tx.order.update({ where: { id: payment.orderId }, data: { status: "REFUNDED" } });
          await tx.orderStatusHistory.create({
            data: { orderId: payment.orderId, fromStatus: payment.order.status, toStatus: "REFUNDED", note: "Remboursement intégral confirmé par Stripe" },
          });
        }
        return "processed" as const;
      }
      default:
        return "ignored" as const;
    }
  });

  // Effets hors transaction (e-mails, libération de stock idempotente)
  const release = toRelease as { orderId: string; note: string } | null;
  if (release) await releasePendingOrder(release.orderId, release.note);
  if (paidOrderId) await sendPaidEmails(paidOrderId).catch((e) => console.error("[e-mail] commande payée", e));
  return result;
}

/** Remboursement déclenché par l'administration. */
export async function refundPayment(input: { paymentId: string; amountCents: number; restockItems: boolean; reason?: string | null; actorId: string }) {
  const stripe = getStripe();
  if (!stripe) return { ok: false as const, error: "Paiement non configuré." };
  const payment = await db.payment.findUnique({ where: { id: input.paymentId }, include: { order: true } });
  if (!payment || !payment.stripePaymentIntentId) return { ok: false as const, error: "Paiement introuvable." };
  if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") return { ok: false as const, error: "Ce paiement ne peut pas être remboursé." };
  const remaining = payment.amountCents - payment.refundedCents;
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0 || input.amountCents > remaining) {
    return { ok: false as const, error: `Montant invalide (maximum remboursable : ${(remaining / 100).toFixed(2)} €).` };
  }
  try {
    const refund = await stripe.refunds.create(
      { payment_intent: payment.stripePaymentIntentId, amount: input.amountCents, metadata: { orderId: payment.orderId } },
      { idempotencyKey: `refund-${payment.id}-${payment.refundedCents}-${input.amountCents}` },
    );
    const newRefunded = payment.refundedCents + input.amountCents;
    const full = newRefunded >= payment.amountCents;
    await db.$transaction(async (tx) => {
      await tx.refund.upsert({
        where: { stripeRefundId: refund.id },
        create: { paymentId: payment.id, stripeRefundId: refund.id, amountCents: input.amountCents, reason: input.reason || null, status: refund.status ?? "pending", actorId: input.actorId },
        update: { status: refund.status ?? "pending" },
      });
      if (refund.status === "succeeded" || refund.status === "pending") {
        await tx.payment.update({ where: { id: payment.id }, data: { refundedCents: newRefunded, status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
        if (full) {
          const res = await tx.order.updateMany({ where: { id: payment.orderId, status: { not: "REFUNDED" } }, data: { status: "REFUNDED" } });
          if (res.count === 1) {
            await tx.orderStatusHistory.create({
              data: { orderId: payment.orderId, fromStatus: payment.order.status, toStatus: "REFUNDED", actorId: input.actorId, note: input.reason || "Remboursement intégral" },
            });
          }
        } else {
          await tx.orderStatusHistory.create({
            data: { orderId: payment.orderId, fromStatus: payment.order.status, toStatus: payment.order.status, actorId: input.actorId, note: `Remboursement partiel de ${(input.amountCents / 100).toFixed(2)} €` },
          });
        }
        if (input.restockItems) await restock(tx, payment.orderId, "REFUND_RESTOCK", input.actorId);
      }
    });
    return { ok: true as const, status: refund.status };
  } catch (e) {
    console.error("[stripe] remboursement échoué", e instanceof Error ? e.message : e);
    return { ok: false as const, error: "Stripe a refusé le remboursement. Consultez le tableau de bord Stripe." };
  }
}
