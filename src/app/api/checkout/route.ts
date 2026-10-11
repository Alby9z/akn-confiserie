import { createPendingOrder, expireStaleOrders } from "@/lib/orders";
import { createCheckoutSession } from "@/lib/payments";
import { getClientIp, isSameOrigin } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { isPaymentConfigured } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validation/schemas";
import { COUPON_ERROR_MESSAGES } from "@/lib/pricing";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Requête refusée." }, { status: 403 });
  if (!(await rateLimit(`checkout:${await getClientIp()}`, 10, 600))) {
    return Response.json({ error: "Trop de tentatives. Patientez quelques minutes avant de réessayer." }, { status: 429 });
  }
  if (!isPaymentConfigured()) {
    return Response.json({ error: "Le paiement en ligne n'est pas encore activé. Contactez la boutique pour commander." }, { status: 503 });
  }
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Certaines informations sont invalides.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  await expireStaleOrders();
  const session = await getSession();
  const result = await createPendingOrder({
    lines: d.lines,
    couponCode: d.couponCode || null,
    fulfillment: d.fulfillment,
    customer: { email: d.email, firstName: d.firstName, lastName: d.lastName, phone: d.phone },
    address: d.fulfillment === "DELIVERY" && d.address ? { ...d.address, line2: d.address.line2 || null } : null,
    note: d.note || null,
    userId: session?.user.id ?? null,
  });
  if (!result.ok) {
    const e = result.error;
    let message = "Impossible de créer la commande.";
    if (e.code === "empty_cart") message = "Votre panier est vide.";
    if (e.code === "cart_issues" || e.code === "stock_conflict") message = "Certains articles ne sont plus disponibles dans la quantité demandée. Votre panier a été mis à jour.";
    if (e.code === "coupon") message = COUPON_ERROR_MESSAGES[e.error];
    if (e.code === "fulfillment_unavailable") message = "Ce mode de retrait ou de livraison n'est pas disponible.";
    if (e.code === "address_required") message = "L'adresse de livraison est obligatoire.";
    return Response.json({ error: message, code: e.code }, { status: 409 });
  }
  const checkout = await createCheckoutSession(result.order.id, result.guestToken);
  if (!checkout.ok) {
    return Response.json({ error: "Le service de paiement est momentanément indisponible. Aucun montant n'a été débité ; réessayez dans quelques instants." }, { status: 502 });
  }
  // On mémorise l'adresse e-mail/téléphone de la cliente connectée si absents
  if (session && d.phone) await db.user.updateMany({ where: { id: session.user.id, phone: null }, data: { phone: d.phone } });
  return Response.json({ url: checkout.url });
}
