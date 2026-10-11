import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { orderFilters } from "@/lib/admin-orders";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { orderRef } from "@/lib/utils";
import { audit } from "@/lib/audit";

/** Export CSV contrôlé : administratrices uniquement, colonnes utiles à la comptabilité et à la préparation. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new Response("Introuvable", { status: 404 });
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const orders = await db.order.findMany({ where: orderFilters(sp), orderBy: { createdAt: "asc" }, include: { items: true }, take: 5000 });
  // Neutralise les formules (=, +, -, @) pour éviter l'injection dans Excel
  const cell = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const header = ["Commande", "Date", "Statut", "Prénom", "Nom", "E-mail", "Téléphone", "Mode", "Articles", "Sous-total", "Réduction", "Code promo", "Livraison", "Total TTC", "Payée le"];
  const rows = orders.map((o) => [
    orderRef(o.number),
    o.createdAt.toLocaleString("fr-FR"),
    ORDER_STATUS_LABELS[o.status],
    o.firstName,
    o.lastName,
    o.email,
    o.phone,
    o.fulfillment === "PICKUP" ? "Retrait" : "Livraison",
    o.items.map((i) => `${i.quantity} x ${i.productName}`).join(" | "),
    euros(o.subtotalCents),
    euros(o.discountCents),
    o.couponCode,
    euros(o.shippingCents),
    euros(o.totalCents),
    o.paidAt?.toLocaleString("fr-FR") ?? "",
  ]);
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  await audit(user.id, "order.export", "Order", null, { count: orders.length });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
