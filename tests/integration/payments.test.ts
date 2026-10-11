import { beforeEach, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { createPendingOrder } from "@/lib/orders";
import { handleStripeEvent } from "@/lib/payments";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { customer, product, resetDb, settings } from "../helpers";

const stripe = new Stripe("sk_test_dummy_key_for_signature_tests");
const SECRET = "whsec_test_secret_for_vitest";
let seq = 0;

function sessionEvent(type: string, orderId: string, sessionId: string, over: Record<string, unknown> = {}) {
  seq++;
  return {
    id: `evt_test_${seq}_${Date.now()}`,
    object: "event",
    type,
    data: { object: { id: sessionId, object: "checkout.session", metadata: { orderId }, client_reference_id: orderId, payment_status: "paid", currency: "eur", amount_total: 0, payment_intent: `pi_${sessionId}`, ...over } },
  } as unknown as Stripe.Event;
}

async function pendingOrder(priceCents = 500, qty = 2, stock = 5) {
  const p = await product({ priceCents, stock });
  const r = await createPendingOrder({ lines: [{ productId: p.id, quantity: qty }], fulfillment: "PICKUP", customer });
  if (!r.ok) throw new Error("commande non créée");
  const sessionId = `cs_test_${r.order.id}`;
  await db.payment.create({ data: { orderId: r.order.id, stripeCheckoutSessionId: sessionId, amountCents: r.order.totalCents } });
  return { order: r.order, sessionId, productId: p.id };
}

beforeEach(async () => {
  await resetDb();
  await settings();
});

describe("webhooks Stripe", () => {
  it("marque la commande payée uniquement sur événement vérifié, de façon idempotente", async () => {
    const { order, sessionId } = await pendingOrder();
    const evt = sessionEvent("checkout.session.completed", order.id, sessionId, { amount_total: order.totalCents });
    expect(await handleStripeEvent(evt)).toBe("processed");
    expect(await handleStripeEvent(evt)).toBe("duplicate");
    // Un second événement distinct pour la même session ne change rien non plus
    expect(await handleStripeEvent(sessionEvent("checkout.session.async_payment_succeeded", order.id, sessionId, { amount_total: order.totalCents }))).toBe("processed");
    const o = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { statusHistory: true, payments: true } });
    expect(o.status).toBe("PAID");
    expect(o.paidAt).not.toBeNull();
    expect(o.statusHistory.filter((h) => h.toStatus === "PAID")).toHaveLength(1);
    expect(o.payments[0].status).toBe("SUCCEEDED");
    expect(await db.emailLog.count({ where: { template: "order_confirmation" } })).toBe(1);
  });

  it("traite correctement des doublons reçus en parallèle", async () => {
    const { order, sessionId } = await pendingOrder();
    const evt = sessionEvent("checkout.session.completed", order.id, sessionId, { amount_total: order.totalCents });
    const results = await Promise.all([handleStripeEvent(evt), handleStripeEvent(evt), handleStripeEvent(evt)]);
    expect(results.filter((r) => r === "processed")).toHaveLength(1);
    expect(await db.orderStatusHistory.count({ where: { orderId: order.id, toStatus: "PAID" } })).toBe(1);
  });

  it("ne valide pas une commande si le montant payé diffère", async () => {
    const { order, sessionId } = await pendingOrder();
    await handleStripeEvent(sessionEvent("checkout.session.completed", order.id, sessionId, { amount_total: 1 }));
    const o = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { statusHistory: true } });
    expect(o.status).toBe("PENDING_PAYMENT");
    expect(o.statusHistory.some((h) => h.note?.startsWith("ALERTE"))).toBe(true);
  });

  it("attend la confirmation d'un paiement différé", async () => {
    const { order, sessionId } = await pendingOrder();
    await handleStripeEvent(sessionEvent("checkout.session.completed", order.id, sessionId, { amount_total: order.totalCents, payment_status: "unpaid" }));
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING_PAYMENT");
  });

  it("libère le stock quand la session expire", async () => {
    const { order, sessionId, productId } = await pendingOrder(500, 2, 5);
    expect((await db.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(3);
    await handleStripeEvent(sessionEvent("checkout.session.expired", order.id, sessionId, { payment_status: "unpaid" }));
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLED");
    expect((await db.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(5);
  });

  it("signale un paiement reçu sur une commande déjà annulée", async () => {
    const { order, sessionId } = await pendingOrder();
    await handleStripeEvent(sessionEvent("checkout.session.expired", order.id, sessionId));
    await handleStripeEvent(sessionEvent("checkout.session.completed", order.id, sessionId, { amount_total: order.totalCents }));
    const o = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { statusHistory: true } });
    expect(o.status).toBe("CANCELLED");
    expect(o.statusHistory.some((h) => h.note?.includes("Rembourser"))).toBe(true);
  });

  it("enregistre un remboursement intégral", async () => {
    const { order, sessionId } = await pendingOrder();
    await handleStripeEvent(sessionEvent("checkout.session.completed", order.id, sessionId, { amount_total: order.totalCents }));
    await handleStripeEvent({ id: `evt_refund_${Date.now()}`, object: "event", type: "charge.refunded", data: { object: { object: "charge", payment_intent: `pi_${sessionId}`, amount_refunded: order.totalCents } } } as unknown as Stripe.Event);
    const o = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(o.status).toBe("REFUNDED");
    expect(o.payments[0]).toMatchObject({ status: "REFUNDED", refundedCents: order.totalCents });
  });
});

describe("route webhook", () => {
  function post(body: string, signature?: string) {
    return webhook(new Request("http://localhost:3000/api/stripe/webhook", { method: "POST", body, headers: signature ? { "stripe-signature": signature } : {} }));
  }

  it("rejette une requête sans signature ou mal signée", async () => {
    const payload = JSON.stringify({ id: "evt_x", object: "event", type: "checkout.session.completed", data: { object: {} } });
    expect((await post(payload)).status).toBe(400);
    expect((await post(payload, "t=1,v1=deadbeef")).status).toBe(400);
    const forged = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_autre_secret" });
    expect((await post(payload, forged)).status).toBe(400);
  });

  it("accepte un événement signé et marque la commande payée", async () => {
    const { order, sessionId } = await pendingOrder();
    const evt = sessionEvent("checkout.session.completed", order.id, sessionId, { amount_total: order.totalCents });
    const payload = JSON.stringify(evt);
    const res = await post(payload, stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }));
    expect(res.status).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
  });
});
