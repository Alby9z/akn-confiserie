"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { done, fail, optStr, str } from "@/lib/admin-redirect";
import { slugify } from "@/lib/utils";
import { recordRedirect } from "@/lib/redirects";
import { parsePriceToCents } from "@/lib/money";
import { normalizeCouponCode } from "@/lib/pricing";

const BACK = "/admin/categories";

export async function saveCategory(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name");
  const slug = slugify(str(fd, "slug") || name);
  if (name.length < 2 || name.length > 80) fail(BACK, "Nom de catégorie invalide.");
  if (!slug) fail(BACK, "Adresse (slug) invalide.");
  const clash = await db.category.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) } });
  if (clash) fail(BACK, "Cette adresse est déjà utilisée par une autre catégorie.");
  const data = {
    name,
    slug,
    description: optStr(fd, "description")?.slice(0, 1000) ?? null,
    isActive: fd.get("isActive") === "on",
    seoTitle: optStr(fd, "seoTitle")?.slice(0, 70) ?? null,
    seoDescription: optStr(fd, "seoDescription")?.slice(0, 170) ?? null,
  };
  if (id) {
    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) fail(BACK, "Catégorie introuvable.");
    await db.$transaction(async (tx) => {
      await tx.category.update({ where: { id }, data });
      if (existing.slug !== slug) await recordRedirect(tx, `/categorie/${existing.slug}`, `/categorie/${slug}`);
    });
    await audit(admin.id, "category.update", "Category", id, { name });
  } else {
    const max = await db.category.aggregate({ _max: { position: true } });
    const c = await db.category.create({ data: { ...data, position: (max._max.position ?? 0) + 1 } });
    await audit(admin.id, "category.create", "Category", c.id, { name });
  }
  revalidatePath("/", "layout");
  done(BACK, "Catégorie enregistrée.");
}

export async function moveCategory(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id");
  const dir = str(fd, "dir") === "up" ? -1 : 1;
  const all = await db.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] });
  const i = all.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) done(BACK, "Ordre inchangé.");
  const reordered = [...all];
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
  await db.$transaction(reordered.map((c, idx) => db.category.update({ where: { id: c.id }, data: { position: idx } })));
  revalidatePath("/", "layout");
  done(BACK, "Ordre mis à jour.");
}

export async function deleteCategory(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const c = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!c) fail(BACK, "Catégorie introuvable.");
  if (c._count.products > 0) fail(BACK, `Impossible : ${c._count.products} produit(s) sont rangés dans « ${c.name} ». Déplacez-les ou désactivez la catégorie.`);
  await db.category.delete({ where: { id } });
  await audit(admin.id, "category.delete", "Category", id, { name: c.name });
  revalidatePath("/", "layout");
  done(BACK, "Catégorie supprimée.");
}

const couponSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_-]{3,30}$/, "Code : 3 à 30 caractères (lettres, chiffres, - ou _)."),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().positive(),
  minSubtotalCents: z.number().int().nonnegative().nullable(),
  maxUses: z.number().int().positive().nullable(),
  startsAt: z.date().nullable(),
  endsAt: z.date().nullable(),
  isActive: z.boolean(),
});

export async function saveCoupon(fd: FormData) {
  const admin = await assertAdmin();
  const back = "/admin/codes-promo";
  const id = str(fd, "id");
  const type = str(fd, "type") === "FIXED" ? "FIXED" : "PERCENT";
  const value = type === "FIXED" ? parsePriceToCents(str(fd, "value")) : Number(str(fd, "value"));
  if (value == null || !Number.isInteger(value) || value <= 0 || (type === "PERCENT" && value > 100)) fail(back, type === "PERCENT" ? "Pourcentage entre 1 et 100." : "Montant invalide (ex. 5,00).");
  const min = str(fd, "minSubtotal") ? parsePriceToCents(str(fd, "minSubtotal")) : null;
  const parsed = couponSchema.safeParse({
    code: normalizeCouponCode(str(fd, "code")),
    type,
    value,
    minSubtotalCents: min,
    maxUses: str(fd, "maxUses") ? Number(str(fd, "maxUses")) : null,
    startsAt: str(fd, "startsAt") ? new Date(`${str(fd, "startsAt")}T00:00:00`) : null,
    endsAt: str(fd, "endsAt") ? new Date(`${str(fd, "endsAt")}T23:59:59`) : null,
    isActive: fd.get("isActive") === "on",
  });
  if (!parsed.success) fail(back, parsed.error.issues[0]?.message ?? "Code invalide.");
  const d = parsed.data;
  if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) fail(back, "La date de fin précède la date de début.");
  const clash = await db.coupon.findFirst({ where: { code: d.code, ...(id ? { id: { not: id } } : {}) } });
  if (clash) fail(back, "Ce code existe déjà.");
  if (id) await db.coupon.update({ where: { id }, data: d });
  else await db.coupon.create({ data: d });
  await audit(admin.id, id ? "coupon.update" : "coupon.create", "Coupon", id || d.code, { code: d.code });
  done(back, "Code promotionnel enregistré.");
}

export async function toggleCoupon(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const c = await db.coupon.findUnique({ where: { id } });
  if (!c) fail("/admin/codes-promo", "Code introuvable.");
  await db.coupon.update({ where: { id }, data: { isActive: !c.isActive } });
  await audit(admin.id, "coupon.toggle", "Coupon", id, { isActive: !c.isActive });
  done("/admin/codes-promo", c.isActive ? "Code désactivé." : "Code activé.");
}
