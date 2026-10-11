import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isSameOrigin } from "@/lib/security";
import { cartLinesSchema } from "@/lib/validation/schemas";
import { normalizeLines } from "@/lib/pricing";

/** Panier persistant de la cliente connectée. */
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const cart = await db.cart.findUnique({ where: { userId: session.user.id }, include: { items: true } });
  return Response.json({ lines: cart?.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const parsed = z.object({ lines: cartLinesSchema }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const lines = normalizeLines(parsed.data.lines);
  const existing = await db.product.findMany({ where: { id: { in: lines.map((l) => l.productId) } }, select: { id: true } });
  const known = new Set(existing.map((p) => p.id));
  const valid = lines.filter((l) => known.has(l.productId));
  await db.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({ where: { userId: session.user.id }, create: { userId: session.user.id }, update: {} });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    if (valid.length) await tx.cartItem.createMany({ data: valid.map((l) => ({ cartId: cart.id, productId: l.productId, quantity: l.quantity })) });
  });
  return Response.json({ ok: true });
}
