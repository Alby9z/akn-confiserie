import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Limiteur à fenêtre fixe stocké en base (pas de Redis nécessaire pour ce volume).
 * Retourne true si la requête est autorisée.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const fullKey = `site:${key}`;
  return db.$transaction(async (tx) => {
    const row = await tx.rateLimit.findUnique({ where: { key: fullKey } });
    if (!row || Number(row.lastRequest) < windowStart) {
      await tx.rateLimit.upsert({
        where: { key: fullKey },
        create: { id: randomUUID(), key: fullKey, count: 1, lastRequest: BigInt(now) },
        update: { count: 1, lastRequest: BigInt(now) },
      });
      return true;
    }
    if (row.count >= max) return false;
    await tx.rateLimit.update({ where: { key: fullKey }, data: { count: { increment: 1 } } });
    return true;
  });
}
