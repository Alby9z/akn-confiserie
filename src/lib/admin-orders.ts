import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { OrderStatus } from "@/generated/prisma/enums";

export function orderFilters(sp: { q?: string; statut?: string; du?: string; au?: string }): Prisma.OrderWhereInput {
  const q = sp.q?.trim().slice(0, 80);
  const num = q?.replace(/^AKN-?/i, "");
  const status = sp.statut && (Object.values(OrderStatus) as string[]).includes(sp.statut) ? (sp.statut as OrderStatus) : undefined;
  const from = sp.du && /^\d{4}-\d{2}-\d{2}$/.test(sp.du) ? new Date(`${sp.du}T00:00:00`) : undefined;
  const to = sp.au && /^\d{4}-\d{2}-\d{2}$/.test(sp.au) ? new Date(`${sp.au}T23:59:59`) : undefined;
  return {
    ...(status ? { status } : { status: { not: "PENDING_PAYMENT" } }),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(q
      ? {
          OR: [
            ...(num && /^\d+$/.test(num) ? [{ number: Number(num) }] : []),
            { email: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { firstName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}
