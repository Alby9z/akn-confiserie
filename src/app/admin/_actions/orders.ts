"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { done, fail, optStr, str } from "@/lib/admin-redirect";
import { canTransition } from "@/lib/order-status";
import { releasePendingOrder, setOrderStatus } from "@/lib/orders";
import { refundPayment } from "@/lib/payments";
import { parsePriceToCents } from "@/lib/money";
import { sendEmail } from "@/lib/email/send";
import { orderStatusEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/env";
import { orderRef } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { OrderStatus } from "@/generated/prisma/enums";

export async function changeOrderStatus(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const back = `/admin/commandes/${id}`;
  const to = str(fd, "to") as OrderStatus;
  if (!Object.values(OrderStatus).includes(to)) fail(back, "Statut inconnu.");
  const order = await db.order.findUnique({ where: { id } });
  if (!order) fail("/admin/commandes", "Commande introuvable.");
  if (!canTransition(order.status, to, order.fulfillment)) fail(back, "Ce changement de statut n'est pas autorisé.");
  const note = optStr(fd, "note");
  if (to === "CANCELLED" && order.status === "PENDING_PAYMENT") {
    await releasePendingOrder(id, note ?? "Annulée par la boutique", admin.id);
  } else if (!(await setOrderStatus(id, order.status, to, admin.id, note))) {
    fail(back, "La commande a été modifiée entre-temps. Rechargez la page.");
  }
  await audit(admin.id, "order.status_change", "Order", id, { from: order.status, to });
  if (fd.get("notify") === "on" && ["PREPARING", "READY_FOR_PICKUP", "SHIPPED", "COMPLETED"].includes(to)) {
    const settings = await getSettings();
    const url = order.userId ? `${appUrl}/compte/commandes/${order.id}` : appUrl;
    await sendEmail({ to: order.email, ...orderStatusEmail({ ref: orderRef(order.number), firstName: order.firstName, status: to, url, pickupInfo: settings.pickupInfo }), template: `order_status_${to.toLowerCase()}` });
  }
  revalidatePath(back);
  done(back, "Statut mis à jour.");
}

export async function refundOrder(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const back = `/admin/commandes/${id}`;
  const paymentId = str(fd, "paymentId");
  const payment = await db.payment.findFirst({ where: { id: paymentId, orderId: id } });
  if (!payment) fail(back, "Paiement introuvable.");
  const amount = str(fd, "amount") ? parsePriceToCents(str(fd, "amount")) : payment.amountCents - payment.refundedCents;
  if (amount == null) fail(back, "Montant invalide.");
  if (fd.get("confirm") !== "on") fail(back, "Cochez la case de confirmation du remboursement.");
  const result = await refundPayment({ paymentId, amountCents: amount, restockItems: fd.get("restock") === "on", reason: optStr(fd, "reason"), actorId: admin.id });
  await audit(admin.id, "order.refund", "Order", id, { amountCents: amount, ok: result.ok });
  if (!result.ok) fail(back, result.error);
  revalidatePath(back);
  done(back, result.status === "succeeded" ? "Remboursement effectué." : "Remboursement demandé à Stripe (en cours de traitement).");
}
