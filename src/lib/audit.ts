import "server-only";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/security";
import type { Prisma } from "@/generated/prisma/client";

/** Journal des actions sensibles. Ne jamais y mettre de mot de passe, jeton ou donnée bancaire. */
export async function audit(actorId: string | null, action: string, entityType: string, entityId?: string | null, metadata?: Prisma.InputJsonValue) {
  let ipAddress: string | null = null;
  try {
    ipAddress = await getClientIp();
  } catch {
    ipAddress = null;
  }
  await db.auditLog.create({ data: { actorId, action, entityType, entityId: entityId ?? null, metadata, ipAddress } });
}
