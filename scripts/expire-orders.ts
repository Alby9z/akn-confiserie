/**
 * Libère le stock des commandes non payées dont la réservation a expiré.
 * À planifier toutes les 15 minutes (Planificateur de tâches Windows, cron, ou tâche de l'hébergeur).
 * (Le site le fait aussi à la volée ; cette tâche garantit la libération même sans trafic.)
 */
import { existsSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (existsSync(".env")) process.loadEnvFile(".env");

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const stale = await db.order.findMany({ where: { status: "PENDING_PAYMENT", reservationExpiresAt: { lt: new Date() } }, select: { id: true } });
    let n = 0;
    for (const o of stale) {
      const ok = await db.$transaction(async (tx) => {
        const res = await tx.order.updateMany({ where: { id: o.id, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED" } });
        if (res.count !== 1) return false;
        const items = await tx.orderItem.findMany({ where: { orderId: o.id, productId: { not: null } } });
        for (const it of items) {
          await tx.product.update({ where: { id: it.productId! }, data: { stock: { increment: it.quantity } } });
          await tx.stockMovement.create({ data: { productId: it.productId!, delta: it.quantity, reason: "ORDER_RELEASED", orderId: o.id } });
        }
        const order = await tx.order.findUniqueOrThrow({ where: { id: o.id }, select: { couponId: true } });
        if (order.couponId) await tx.coupon.updateMany({ where: { id: order.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
        await tx.payment.updateMany({ where: { orderId: o.id, status: "PENDING" }, data: { status: "CANCELLED" } });
        await tx.orderStatusHistory.create({ data: { orderId: o.id, fromStatus: "PENDING_PAYMENT", toStatus: "CANCELLED", note: "Réservation expirée sans paiement (tâche planifiée)" } });
        return true;
      });
      if (ok) n++;
    }
    console.log(`${n} commande(s) expirée(s) libérée(s).`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
