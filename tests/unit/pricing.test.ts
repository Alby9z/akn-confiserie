import { describe, expect, it } from "vitest";
import { availableFulfillments, computeTotals, evaluateCoupon, normalizeLines, priceLines, shippingCost, type PricingCoupon } from "@/lib/pricing";
import { formatPrice, parsePriceToCents, pricePerKgCents } from "@/lib/money";

const p = (id: string, priceCents: number, stock = 10, isActive = true) => ({ id, name: id, priceCents, stock, isActive });
const coupon = (over: Partial<PricingCoupon> = {}): PricingCoupon => ({ id: "c", code: "X", type: "PERCENT", value: 10, minSubtotalCents: null, startsAt: null, endsAt: null, maxUses: null, usedCount: 0, isActive: true, ...over });

describe("normalizeLines", () => {
  it("regroupe les doublons et rejette les quantités invalides", () => {
    expect(normalizeLines([{ productId: "a", quantity: 2 }, { productId: "a", quantity: 3 }, { productId: "b", quantity: -1 }, { productId: "c", quantity: 1.5 }, { productId: "d", quantity: 0 }])).toEqual([{ productId: "a", quantity: 5 }]);
  });
  it("plafonne à 99 par ligne", () => {
    expect(normalizeLines([{ productId: "a", quantity: 80 }, { productId: "a", quantity: 80 }])[0].quantity).toBe(99);
  });
});

describe("priceLines", () => {
  it("utilise uniquement les prix de la base", () => {
    const r = priceLines([{ productId: "a", quantity: 3 }], [p("a", 490)]);
    expect(r.subtotalCents).toBe(1470);
    expect(r.lines[0]).toMatchObject({ unitPriceCents: 490, lineTotalCents: 1470 });
  });
  it("signale les produits inactifs, inconnus ou en stock insuffisant", () => {
    const r = priceLines([{ productId: "a", quantity: 5 }, { productId: "b", quantity: 1 }, { productId: "zz", quantity: 1 }], [p("a", 100, 2), p("b", 100, 5, false)]);
    expect(r.lines).toHaveLength(0);
    expect(r.issues.map((i) => i.type).sort()).toEqual(["insufficient_stock", "unavailable", "unavailable"]);
    expect(r.issues.find((i) => i.type === "insufficient_stock")).toMatchObject({ available: 2 });
  });
});

describe("evaluateCoupon", () => {
  const now = new Date("2026-06-15T12:00:00Z");
  it("calcule un pourcentage arrondi à l'inférieur", () => {
    expect(evaluateCoupon(coupon({ value: 15 }), 999, now)).toEqual({ ok: true, discountCents: 149 });
  });
  it("ne dépasse jamais le sous-total", () => {
    expect(evaluateCoupon(coupon({ type: "FIXED", value: 5000 }), 1200, now)).toEqual({ ok: true, discountCents: 1200 });
  });
  it.each([
    [coupon({ isActive: false }), "inactive"],
    [coupon({ startsAt: new Date("2026-07-01") }), "not_started"],
    [coupon({ endsAt: new Date("2026-06-01") }), "expired"],
    [coupon({ maxUses: 3, usedCount: 3 }), "exhausted"],
    [coupon({ minSubtotalCents: 2000 }), "min_subtotal"],
    [null, "not_found"],
  ])("refuse les codes non valables (%#)", (c, error) => {
    expect(evaluateCoupon(c, 1000, now)).toEqual({ ok: false, error });
  });
});

describe("livraison", () => {
  const rules = { pickupEnabled: true, deliveryEnabled: true, deliveryFeeCents: 590, freeDeliveryThresholdCents: 4000 };
  it("ne propose la livraison que si un tarif est configuré", () => {
    expect(availableFulfillments({ ...rules, deliveryFeeCents: null })).toEqual(["PICKUP"]);
    expect(availableFulfillments({ ...rules, pickupEnabled: false, deliveryEnabled: false })).toEqual([]);
  });
  it("applique la gratuité au-delà du seuil", () => {
    expect(shippingCost(rules, "DELIVERY", 3999)).toBe(590);
    expect(shippingCost(rules, "DELIVERY", 4000)).toBe(0);
    expect(shippingCost(rules, "PICKUP", 100)).toBe(0);
    expect(shippingCost({ ...rules, deliveryEnabled: false }, "DELIVERY", 100)).toBeNull();
  });
  it("calcule un total cohérent", () => {
    expect(computeTotals({ subtotalCents: 2000, discountCents: 300, shippingCents: 590 })).toEqual({ subtotalCents: 2000, discountCents: 300, shippingCents: 590, totalCents: 2290 });
  });
});

describe("montants", () => {
  it("analyse les prix saisis sans flottant", () => {
    expect(parsePriceToCents("4,90")).toBe(490);
    expect(parsePriceToCents("0.1")).toBe(10);
    expect(parsePriceToCents("12")).toBe(1200);
    expect(parsePriceToCents("1,999")).toBeNull();
    expect(parsePriceToCents("-3")).toBeNull();
    expect(parsePriceToCents("abc")).toBeNull();
  });
  it("calcule le prix au kilo", () => {
    expect(pricePerKgCents(450, 200)).toBe(2250);
    expect(pricePerKgCents(450, null)).toBeNull();
  });
  it("formate en euros", () => {
    expect(formatPrice(1234).replace(/\s/g, " ")).toBe("12,34 €");
  });
});
