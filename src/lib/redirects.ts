import "server-only";
import { permanentRedirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function recordRedirect(tx: Prisma.TransactionClient, fromPath: string, toPath: string) {
  if (fromPath === toPath) return;
  // Évite les chaînes : les anciennes redirections pointent directement vers la nouvelle URL
  await tx.urlRedirect.updateMany({ where: { toPath: fromPath }, data: { toPath } });
  await tx.urlRedirect.deleteMany({ where: { fromPath: toPath } });
  await tx.urlRedirect.upsert({ where: { fromPath }, create: { fromPath, toPath }, update: { toPath } });
}

/** À appeler avant notFound() : redirige si l'ancienne URL a été renommée. */
export async function followRedirect(path: string) {
  const r = await db.urlRedirect.findUnique({ where: { fromPath: path } });
  if (r) permanentRedirect(r.toPath);
}
