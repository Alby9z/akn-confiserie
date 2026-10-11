import { readStored } from "@/lib/storage";

/** Sert uniquement les photos produits. Les pièces jointes des demandes passent par /admin. */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  if (key[0] !== "products" || key.length !== 2) return new Response("Introuvable", { status: 404 });
  const file = await readStored(key.join("/"));
  if (!file || !file.mime.startsWith("image/")) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
