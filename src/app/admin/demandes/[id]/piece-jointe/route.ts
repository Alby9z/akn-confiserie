import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { readStored } from "@/lib/storage";

/** Pièce jointe d'une demande : réservée aux administratrices, toujours téléchargée (jamais affichée inline). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new Response("Introuvable", { status: 404 });
  const { id } = await ctx.params;
  const r = await db.customRequest.findUnique({ where: { id }, select: { attachmentKey: true, attachmentName: true } });
  if (!r?.attachmentKey) return new Response("Introuvable", { status: 404 });
  const file = await readStored(r.attachmentKey);
  if (!file) return new Response("Introuvable", { status: 404 });
  const name = encodeURIComponent(r.attachmentName ?? "piece-jointe");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `attachment; filename*=UTF-8''${name}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
