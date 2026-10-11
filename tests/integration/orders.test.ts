import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createPendingOrder, expireStaleOrders, releasePendingOrder } from "@/lib/orders";
import { customer, product, resetDb, settings } from "../helpers";

beforeEach(async () => {
  await resetDb();
  await settings();
});

describe("création de commande", () => {
  it("calcule les montants côté serveur et réserve le stock", async () => {
    const a = await product({ priceCents: 390, stock: 5 });
    const b = await product({ priceCents: 1250, stock: 2 });
    const r = await createPendingOrder({ lines: [{ productId: a.id, quantity: 2 }, { productId: b.id, quantity: 1 }], fulfillment: "PICKUP", customer });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const order = await db.order.findUniqueOrThrow({ where: { id: r.order.id }, include: { items: true, statusHistory: true } });
    expect(order.subtotalCents).toBe(2 * 390 + 1250);
    expect(order.totalCents).toBe(2030);
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.guestTokenHash).not.toBe(r.guestToken); // seul le hash est stocké
    expect((await db.product.findUniqueOrThrow({ where: { id: a.id } })).stock).toBe(3);
    expect((await db.product.findUniqueOrThrow({ where: { id: b.id } })).stock).toBe(1);
    expect(await db.stockMovement.count({ where: { orderId: order.id, reason: "ORDER_RESERVED" } })).toBe(2);
  });

  it("refuse une quantité supérieure au stock", async () => {
    const a = await product({ stock: 1 });
    const r = await createPendingOrder({ lines: [{ productId: a.id, quantity: 2 }], fulfillment: "PICKUP", customer });
    expect(r).toMatchObject({ ok: false, error: { code: "cart_issues" } });
    expect((await db.product.findUniqueOrThrow({ where: { id: a.id } })).stock).toBe(1);
  });

  it("ne vend jamais deux fois la dernière unité (commandes simultanées)", async () => {
    const a = await product({ stock: 1 });
    const attempts = await Promise.all(Array.from({ length: 6 }, () => createPendingOrder({ lines: [{ productId: a.id, quantity: 1 }], fulfillment: "PICKUP", customer })));
    expect(attempts.filter((r) => r.ok)).toHaveLength(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: a.id } })).stock).toBe(0);
  });

  it("refuse un mode de remise non proposé", async () => {
    const a = await product();
    const r = await createPendingOrder({ lines: [{ productId: a.id, quantity: 1 }], fulfillment: "DELIVERY", customer, address: { fullName: "X", line1: "1 rue", postalCode: "90000", city: "Belfort" } });
    expect(r).toMatchObject({ ok: false, error: { code: "fulfillment_unavailable" } });
  });

  it("applique les frais de livraison configurés", async () => {
    await db.siteSettings.update({ where: { id: 1 }, data: { deliveryEnabled: true, deliveryFeeCents: 590, freeDeliveryThresholdCents: 5000 } });
    const a = await product({ priceCents: 1000 });
    const r = await createPendingOrder({ lines: [{ productId: a.id, quantity: 2 }], fulfillment: "DELIVERY", customer, address: { fullName: "X", line1: "1 rue", postalCode: "90000", city: "Belfort" } });
    expect(r.ok && r.order.totalCents).toBe(2590);
  });

  it("respecte la limite d'utilisation d'un code promo, même en parallèle", async () => {
    await db.coupon.create({ data: { code: "UNEFOIS", type: "FIXED", value: 100, maxUses: 1 } });
    const a = await product({ stock: 10 });
    const results = await Promise.all(Array.from({ length: 4 }, () => createPendingOrder({ lines: [{ productId: a.id, quantity: 1 }], couponCode: "unefois", fulfillment: "PICKUP", customer })));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await db.coupon.findUniqueOrThrow({ where: { code: "UNEFOIS" } })).usedCount).toBe(1);
    // Le stock des tentatives refusées n'est pas consommé
    expect((await db.product.findUniqueOrThrow({ where: { id: a.id } })).stock).toBe(9);
  });
});

describe("libération des réservations", () => {
  it("annule une commande non payée, rend le stock et le code promo — une seule fois", async () => {
    await db.coupon.create({ data: { code: "MOINS1", type: "FIXED", value: 100 } });
    const a = await product({ stock: 3 });
    const r = await createPendingOrder({ lines: [{ productId: a.id, quantity: 2 }], couponCode: "MOINS1", fulfillment: "PICKUP", customer });
    if (!r.ok) throw new Error("commande non créée");
    expect(await releasePendingOrder(r.order.id, "test")).toBe(true);
    expect(await releasePendingOrder(r.order.id, "test")).toBe(false);
    expect((await db.product.findUniqueOrThrow({ where: { id: a.id } })).stock).toBe(3);
    expect((await db.coupon.findUniqueOrThrow({ where: { code: "MOINS1" } })).usedCount).toBe(0);
    expect((await db.order.findUniqueOrThrow({ where: { id: r.order.id } })).status).toBe("CANCELLED");
  });

  it("expire automatiquement les réservations dépassées", async () => {
    const a = await product({ stock: 2 });
    const r = await createPendingOrder({ lines: [{ productId: a.id, quantity: 2 }], fulfillment: "PICKUP", customer });
    if (!r.ok) throw new Error();
    expect(await expireStaleOrders(new Date())).toBe(0);
    expect(await expireStaleOrders(new Date(Date.now() + 36 * 60_000))).toBe(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: a.id } })).stock).toBe(2);
  });

  it("la base refuse un stock négatif (contrainte d'intégrité)", async () => {
    const a = await product({ stock: 1 });
    await expect(db.product.update({ where: { id: a.id }, data: { stock: { decrement: 5 } } })).rejects.toThrow();
  });
});
