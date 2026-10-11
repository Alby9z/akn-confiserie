import { z } from "zod";
import { db } from "@/lib/db";
import { quoteCart } from "@/lib/orders";
import { isSameOrigin } from "@/lib/security";
import { cartLinesSchema } from "@/lib/validation/schemas";
import { COUPON_ERROR_MESSAGES } from "@/lib/pricing";
import { mediaUrl } from "@/lib/storage";

const bodySchema = z.object({
  lines: cartLinesSchema,
  couponCode: z.string().max(40).optional(),
  fulfillment: z.enum(["PICKUP", "DELIVERY"]).nullable().optional(),
});

/** Recalcule le panier côté serveur : prix, stocks, code promo, livraison. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const { lines, couponCode, fulfillment } = parsed.data;
  const quote = await quoteCart(lines, couponCode || null, fulfillment ?? null);
  const products = await db.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) } },
    select: { id: true, slug: true, stock: true, images: { orderBy: { position: "asc" }, take: 1, select: { storageKey: true, alt: true } } },
  });
  const meta = new Map(products.map((p) => [p.id, p]));
  return Response.json(
    {
      lines: quote.lines.map((l) => {
        const m = meta.get(l.productId);
        return { ...l, slug: m?.slug, stock: m?.stock ?? 0, image: m?.images[0] ? { src: mediaUrl(m.images[0].storageKey), alt: m.images[0].alt } : null };
      }),
      issues: quote.issues,
      subtotalCents: quote.subtotalCents,
      discountCents: quote.discountCents,
      shippingCents: quote.shippingCents,
      totalCents: quote.totalCents,
      fulfillment: quote.fulfillment,
      fulfillmentOptions: quote.fulfillmentOptions,
      coupon: quote.coupon,
      couponError: quote.couponError ? COUPON_ERROR_MESSAGES[quote.couponError] : null,
      deliveryFeeCents: quote.rules.deliveryFeeCents,
      freeDeliveryThresholdCents: quote.rules.freeDeliveryThresholdCents,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
