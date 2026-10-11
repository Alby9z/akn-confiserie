import "server-only";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/security";
import {
  availableFulfillments,
  computeTotals,
  evaluateCoupon,
  normalizeCouponCode,
  priceLines,
  shippingCost,
  type CartIssue,
  type CartLineInput,
  type CouponError,
  type Fulfillment,
} from "@/lib/pricing";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";

/** Durée de réservation du stock pendant le paiement (la session Stripe expire avant : 30 min). */
export const RESERVATION_MINUTES = 35;

export type CustomerInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
};

export type AddressInput = {
  fullName: string;
  line1: string;
  line2?: string | null;
  postalCode: string;
  city: string;
  country?: string;
};

export type CreateOrderInput = {
  lines: CartLineInput[];
  couponCode?: string | null;
  fulfillment: Fulfillment;
  customer: CustomerInput;
  address?: AddressInput | null;
  note?: string | null;
  userId?: string | null;
};

export type CreateOrderError =
  | { code: "empty_cart" }
  | { code: "cart_issues"; issues: CartIssue[] }
  | { code: "coupon"; error: CouponError }
  | { code: "fulfillment_unavailable" }
  | { code: "address_required" }
  | { code: "stock_conflict"; productId: string };

class StockConflict extends Error {
  constructor(public productId: string) {
    super("STOCK_CONFLICT");
  }
}
class CouponExhausted extends Error {}

/** Calcule un devis de panier côté serveur (aucune écriture). */
export async function quoteCart(lines: CartLineInput[], couponCode: string | null | undefined, fulfillment: Fulfillment | null) {
  const settings = await db.siteSettings.findUnique({ where: { id: 1 } });
  const rules = {
    pickupEnabled: settings?.pickupEnabled ?? false,
    deliveryEnabled: settings?.deliveryEnabled ?? false,
    deliveryFeeCents: settings?.deliveryFeeCents ?? null,
    freeDeliveryThresholdCents: settings?.freeDeliveryThresholdCents ?? null,
  };
  const ids = [...new Set(lines.map((l) => l.productId))];
  const products = await db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, priceCents: true, stock: true, isActive: true, packaging: true },
  });
  const priced = priceLines(lines, products);
  let discountCents = 0;
  let couponError: CouponError | null = null;
  let coupon = null;
  if (couponCode) {
    coupon = await db.coupon.findUnique({ where: { code: normalizeCouponCode(couponCode) } });
    const evalRes = evaluateCoupon(coupon, priced.subtotalCents);
    if (evalRes.ok) discountCents = evalRes.discountCents;
    else couponError = evalRes.error;
  }
  const options = availableFulfillments(rules);
  const chosen = fulfillment && options.includes(fulfillment) ? fulfillment : (options[0] ?? null);
  const ship = chosen ? (shippingCost(rules, chosen, priced.subtotalCents - discountCents) ?? 0) : 0;
  return {
    ...priced,
    rules,
    fulfillmentOptions: options,
    fulfillment: chosen,
    couponError,
    coupon: coupon && !couponError ? { id: coupon.id, code: coupon.code } : null,
    ...computeTotals({ subtotalCents: priced.subtotalCents, discountCents, shippingCents: ship }),
  };
}

/**
 * Crée une commande en attente de paiement et réserve le stock, dans une seule transaction.
 * Les décréments de stock sont conditionnels (stock >= quantité) : deux clients ne peuvent
 * jamais acheter la même dernière unité.
 */
export async function createPendingOrder(
  input: CreateOrderInput,
): Promise<{ ok: true; order: { id: string; number: number; totalCents: number }; guestToken: string } | { ok: false; error: CreateOrderError }> {
  if (input.lines.length === 0) return { ok: false, error: { code: "empty_cart" } };
  const quote = await quoteCart(input.lines, input.couponCode, input.fulfillment);
  if (quote.lines.length === 0 && quote.issues.length === 0) return { ok: false, error: { code: "empty_cart" } };
  if (quote.issues.length > 0) return { ok: false, error: { code: "cart_issues", issues: quote.issues } };
  if (input.couponCode && quote.couponError) return { ok: false, error: { code: "coupon", error: quote.couponError } };
  if (!quote.fulfillmentOptions.includes(input.fulfillment)) return { ok: false, error: { code: "fulfillment_unavailable" } };
  if (input.fulfillment === "DELIVERY" && !input.address) return { ok: false, error: { code: "address_required" } };

  const guestToken = randomToken();
  const now = new Date();
  try {
    const order = await db.$transaction(async (tx) => {
      for (const line of quote.lines) {
        const res = await tx.product.updateMany({
          where: { id: line.productId, isActive: true, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (res.count !== 1) throw new StockConflict(line.productId);
      }
      if (quote.coupon) {
        const c = await tx.coupon.findUniqueOrThrow({ where: { id: quote.coupon.id } });
        const res = await tx.coupon.updateMany({
          where: { id: c.id, isActive: true, ...(c.maxUses != null ? { usedCount: { lt: c.maxUses } } : {}) },
          data: { usedCount: { increment: 1 } },
        });
        if (res.count !== 1) throw new CouponExhausted();
      }
      const addr = input.fulfillment === "DELIVERY" ? input.address : null;
      const created = await tx.order.create({
        data: {
          userId: input.userId ?? null,
          email: input.customer.email.toLowerCase(),
          firstName: input.customer.firstName,
          lastName: input.customer.lastName,
          phone: input.customer.phone || null,
          fulfillment: input.fulfillment,
          shipFullName: addr?.fullName ?? null,
          shipLine1: addr?.line1 ?? null,
          shipLine2: addr?.line2 || null,
          shipPostalCode: addr?.postalCode ?? null,
          shipCity: addr?.city ?? null,
          shipCountry: addr ? (addr.country ?? "FR") : null,
          customerNote: input.note || null,
          subtotalCents: quote.subtotalCents,
          discountCents: quote.discountCents,
          shippingCents: quote.shippingCents,
          totalCents: quote.totalCents,
          couponId: quote.coupon?.id ?? null,
          couponCode: quote.coupon?.code ?? null,
          guestTokenHash: sha256(guestToken),
          reservationExpiresAt: new Date(now.getTime() + RESERVATION_MINUTES * 60_000),
          items: {
            create: quote.lines.map((l) => ({
              productId: l.productId,
              productName: l.name,
              packaging: l.packaging,
              unitPriceCents: l.unitPriceCents,
              quantity: l.quantity,
              lineTotalCents: l.lineTotalCents,
            })),
          },
          statusHistory: { create: { toStatus: "PENDING_PAYMENT", note: "Commande créée" } },
        },
        select: { id: true, number: true, totalCents: true },
      });
      await tx.stockMovement.createMany({
        data: quote.lines.map((l) => ({ productId: l.productId, delta: -l.quantity, reason: "ORDER_RESERVED" as const, orderId: created.id })),
      });
      return created;
    });
    return { ok: true, order, guestToken };
  } catch (e) {
    if (e instanceof StockConflict) return { ok: false, error: { code: "stock_conflict", productId: e.productId } };
    if (e instanceof CouponExhausted) return { ok: false, error: { code: "coupon", error: "exhausted" } };
    throw e;
  }
}

async function restock(tx: Prisma.TransactionClient, orderId: string, reason: "ORDER_RELEASED" | "REFUND_RESTOCK", actorId?: string | null) {
  const items = await tx.orderItem.findMany({ where: { orderId, productId: { not: null } } });
  for (const it of items) {
    await tx.product.update({ where: { id: it.productId! }, data: { stock: { increment: it.quantity } } });
    await tx.stockMovement.create({ data: { productId: it.productId!, delta: it.quantity, reason, orderId, actorId: actorId ?? null } });
  }
}

/**
 * Annule une commande non payée et libère stock + utilisation du code promo.
 * Idempotent : sans effet si la commande n'est plus en attente de paiement.
 */
export async function releasePendingOrder(orderId: string, note: string, actorId?: string | null): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({ where: { id: orderId, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED" } });
    if (res.count !== 1) return false;
    await restock(tx, orderId, "ORDER_RELEASED", actorId);
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { couponId: true } });
    if (order.couponId) {
      await tx.coupon.updateMany({ where: { id: order.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    }
    await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "CANCELLED" } });
    await tx.orderStatusHistory.create({ data: { orderId, fromStatus: "PENDING_PAYMENT", toStatus: "CANCELLED", actorId: actorId ?? null, note } });
    return true;
  });
}

/** Libère les réservations expirées (appelé à la volée et par la tâche planifiée). */
export async function expireStaleOrders(now = new Date()): Promise<number> {
  const stale = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", reservationExpiresAt: { lt: now } },
    select: { id: true },
    take: 100,
  });
  let n = 0;
  for (const o of stale) if (await releasePendingOrder(o.id, "Réservation expirée sans paiement")) n++;
  return n;
}

/**
 * Marque une commande comme payée. Appelé UNIQUEMENT depuis le webhook Stripe vérifié.
 * Retourne "paid" si la transition a eu lieu, "already" si déjà traitée, "orphan" si la commande
 * avait été annulée entre-temps (paiement à rembourser manuellement).
 */
export async function markOrderPaid(
  tx: Prisma.TransactionClient,
  input: { orderId: string; sessionId: string; paymentIntentId: string | null; amountCents: number },
): Promise<"paid" | "already" | "orphan" | "amount_mismatch"> {
  const order = await tx.order.findUnique({ where: { id: input.orderId } });
  if (!order) return "orphan";
  await tx.payment.upsert({
    where: { stripeCheckoutSessionId: input.sessionId },
    create: { orderId: order.id, stripeCheckoutSessionId: input.sessionId, amountCents: input.amountCents, status: "PENDING" },
    update: {},
  });
  if (input.amountCents !== order.totalCents) {
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, fromStatus: order.status, toStatus: order.status, note: `ALERTE : montant payé (${input.amountCents}) différent du total (${order.totalCents}). Vérification manuelle requise.` },
    });
    await tx.payment.update({ where: { stripeCheckoutSessionId: input.sessionId }, data: { status: "SUCCEEDED", stripePaymentIntentId: input.paymentIntentId, amountCents: input.amountCents } });
    return "amount_mismatch";
  }
  await tx.payment.update({
    where: { stripeCheckoutSessionId: input.sessionId },
    data: { status: "SUCCEEDED", stripePaymentIntentId: input.paymentIntentId, amountCents: input.amountCents },
  });
  const res = await tx.order.updateMany({ where: { id: order.id, status: "PENDING_PAYMENT" }, data: { status: "PAID", paidAt: new Date(), reservationExpiresAt: null } });
  if (res.count === 1) {
    await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: "PENDING_PAYMENT", toStatus: "PAID", note: "Paiement confirmé par Stripe" } });
    return "paid";
  }
  if (order.status === "CANCELLED") {
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, fromStatus: "CANCELLED", toStatus: "CANCELLED", note: "ALERTE : paiement reçu sur une commande déjà annulée. Rembourser le client depuis l'administration." },
    });
    return "orphan";
  }
  return "already";
}

/** Changement de statut manuel par l'administration (les transitions sont vérifiées par l'appelant). */
export async function setOrderStatus(orderId: string, from: OrderStatus, to: OrderStatus, actorId: string, note?: string | null) {
  return db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({ where: { id: orderId, status: from }, data: { status: to } });
    if (res.count !== 1) return false;
    await tx.orderStatusHistory.create({ data: { orderId, fromStatus: from, toStatus: to, actorId, note: note || null } });
    return true;
  });
}

export { restock };
