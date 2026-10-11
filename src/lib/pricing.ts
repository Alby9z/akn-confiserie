/**
 * Calcul des montants d'un panier — fonction pure, exécutée côté serveur
 * à partir des prix en base. Les montants envoyés par le navigateur ne sont jamais utilisés.
 */

export type PricingProduct = {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
  isActive: boolean;
  packaging?: string | null;
};

export type PricingCoupon = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotalCents: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
};

export type ShippingRules = {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeCents: number | null;
  freeDeliveryThresholdCents: number | null;
};

export type Fulfillment = "PICKUP" | "DELIVERY";

export const MAX_QTY_PER_LINE = 99;

export type CartLineInput = { productId: string; quantity: number };

export type PricedLine = {
  productId: string;
  name: string;
  packaging: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type CartIssue =
  | { type: "unavailable"; productId: string; name?: string }
  | { type: "insufficient_stock"; productId: string; name: string; available: number }
  | { type: "invalid_quantity"; productId: string };

export type CouponError = "not_found" | "inactive" | "not_started" | "expired" | "exhausted" | "min_subtotal";

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/** Regroupe les doublons et rejette les quantités invalides. */
export function normalizeLines(lines: CartLineInput[]): CartLineInput[] {
  const map = new Map<string, number>();
  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) continue;
    map.set(l.productId, Math.min(MAX_QTY_PER_LINE, (map.get(l.productId) ?? 0) + l.quantity));
  }
  return [...map.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

export function priceLines(lines: CartLineInput[], products: PricingProduct[]) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const priced: PricedLine[] = [];
  const issues: CartIssue[] = [];
  for (const line of normalizeLines(lines)) {
    const p = byId.get(line.productId);
    if (!p || !p.isActive) {
      issues.push({ type: "unavailable", productId: line.productId, name: p?.name });
      continue;
    }
    if (p.stock < line.quantity) {
      issues.push({ type: "insufficient_stock", productId: p.id, name: p.name, available: Math.max(0, p.stock) });
      continue;
    }
    priced.push({
      productId: p.id,
      name: p.name,
      packaging: p.packaging ?? null,
      unitPriceCents: p.priceCents,
      quantity: line.quantity,
      lineTotalCents: p.priceCents * line.quantity,
    });
  }
  const subtotalCents = priced.reduce((s, l) => s + l.lineTotalCents, 0);
  return { lines: priced, issues, subtotalCents };
}

export function evaluateCoupon(
  coupon: PricingCoupon | null,
  subtotalCents: number,
  now: Date = new Date(),
): { ok: true; discountCents: number } | { ok: false; error: CouponError } {
  if (!coupon) return { ok: false, error: "not_found" };
  if (!coupon.isActive) return { ok: false, error: "inactive" };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: "not_started" };
  if (coupon.endsAt && coupon.endsAt < now) return { ok: false, error: "expired" };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return { ok: false, error: "exhausted" };
  if (coupon.minSubtotalCents != null && subtotalCents < coupon.minSubtotalCents) return { ok: false, error: "min_subtotal" };
  const raw =
    coupon.type === "PERCENT"
      ? Math.floor((subtotalCents * Math.min(100, Math.max(0, coupon.value))) / 100)
      : Math.max(0, coupon.value);
  return { ok: true, discountCents: Math.min(raw, subtotalCents) };
}

export const COUPON_ERROR_MESSAGES: Record<CouponError, string> = {
  not_found: "Ce code promotionnel n'existe pas.",
  inactive: "Ce code promotionnel n'est plus actif.",
  not_started: "Ce code promotionnel n'est pas encore valable.",
  expired: "Ce code promotionnel a expiré.",
  exhausted: "Ce code promotionnel a atteint sa limite d'utilisation.",
  min_subtotal: "Le montant minimum de commande pour ce code n'est pas atteint.",
};

export function availableFulfillments(rules: ShippingRules): Fulfillment[] {
  const out: Fulfillment[] = [];
  if (rules.pickupEnabled) out.push("PICKUP");
  // La livraison n'est proposée que si un tarif a été configuré
  if (rules.deliveryEnabled && rules.deliveryFeeCents != null) out.push("DELIVERY");
  return out;
}

export function shippingCost(rules: ShippingRules, fulfillment: Fulfillment, subtotalAfterDiscountCents: number): number | null {
  if (!availableFulfillments(rules).includes(fulfillment)) return null;
  if (fulfillment === "PICKUP") return 0;
  if (rules.freeDeliveryThresholdCents != null && subtotalAfterDiscountCents >= rules.freeDeliveryThresholdCents) return 0;
  return rules.deliveryFeeCents ?? null;
}

export function computeTotals(input: { subtotalCents: number; discountCents: number; shippingCents: number }) {
  const discount = Math.min(input.discountCents, input.subtotalCents);
  return {
    subtotalCents: input.subtotalCents,
    discountCents: discount,
    shippingCents: input.shippingCents,
    totalCents: input.subtotalCents - discount + input.shippingCents,
  };
}
