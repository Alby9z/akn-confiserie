import { db } from "@/lib/db";

export function setRequestHeaders(h: Record<string, string>) {
  (globalThis as unknown as { __setRequestHeaders: (h: Record<string, string>) => void }).__setRequestHeaders(h);
}

/** Vide toutes les tables métier entre les tests (ordre respectant les clés étrangères). */
export async function resetDb() {
  await db.$executeRawUnsafe(`TRUNCATE TABLE
    "Refund","Payment","OrderStatusHistory","OrderItem","Order","StockMovement","CartItem","Cart","Favorite",
    "ProductRelation","ProductImage","Product","Category","Coupon","CustomRequestMessage","CustomRequest",
    "Address","AuditLog","EmailLog","StripeEvent","UrlRedirect","Faq","LegalPage","SiteSettings",
    "session","account","verification","rateLimit","user" RESTART IDENTITY CASCADE`);
}

export async function settings(over: Partial<{ pickupEnabled: boolean; deliveryEnabled: boolean; deliveryFeeCents: number | null; freeDeliveryThresholdCents: number | null }> = {}) {
  return db.siteSettings.create({ data: { id: 1, pickupEnabled: true, deliveryEnabled: false, ...over } });
}

let n = 0;
export async function product(over: Partial<{ name: string; priceCents: number; stock: number; isActive: boolean }> = {}) {
  n++;
  return db.product.create({ data: { name: over.name ?? `Produit ${n}`, slug: `produit-${n}-${Date.now()}`, priceCents: over.priceCents ?? 450, stock: over.stock ?? 10, isActive: over.isActive ?? true } });
}

export const customer = { email: "client@example.test", firstName: "Camille", lastName: "Martin", phone: "0601020304" };
