"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { done, fail, optStr, str } from "@/lib/admin-redirect";
import { parsePriceToCents } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { deleteStored, saveUpload } from "@/lib/storage";
import { recordRedirect } from "@/lib/redirects";
import { PRODUCT_IMAGE_TYPES } from "@/lib/validation/schemas";

const productSchema = z.object({
  name: z.string().min(2, "Nom trop court.").max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Adresse (slug) invalide : lettres minuscules, chiffres et tirets.").max(80),
  description: z.string().max(5000),
  priceCents: z.number().int().min(1, "Le prix doit être supérieur à 0.").max(1_000_000),
  compareAtPriceCents: z.number().int().positive().nullable(),
  packaging: z.string().max(80).nullable(),
  netWeightGrams: z.number().int().positive().max(1_000_000).nullable(),
  categoryId: z.string().max(40).nullable(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  ingredients: z.string().max(5000).nullable(),
  allergens: z.string().max(2000).nullable(),
  mayContain: z.string().max(2000).nullable(),
  nutrition: z.string().max(3000).nullable(),
  storageInfo: z.string().max(1000).nullable(),
  origin: z.string().max(200).nullable(),
  seoTitle: z.string().max(70, "Titre SEO : 70 caractères maximum.").nullable(),
  seoDescription: z.string().max(170, "Description SEO : 170 caractères maximum.").nullable(),
});

function parseProduct(fd: FormData) {
  const price = parsePriceToCents(str(fd, "price"));
  const compare = str(fd, "compareAtPrice") ? parsePriceToCents(str(fd, "compareAtPrice")) : null;
  if (price == null) return { error: "Prix invalide (exemple : 4,90)." } as const;
  if (str(fd, "compareAtPrice") && compare == null) return { error: "Ancien prix invalide." } as const;
  if (compare != null && compare <= price) return { error: "L'ancien prix doit être supérieur au prix actuel (sinon laissez-le vide)." } as const;
  const weight = str(fd, "netWeightGrams");
  const parsed = productSchema.safeParse({
    name: str(fd, "name"),
    slug: slugify(str(fd, "slug") || str(fd, "name")),
    description: str(fd, "description"),
    priceCents: price,
    compareAtPriceCents: compare,
    packaging: optStr(fd, "packaging"),
    netWeightGrams: weight ? Number(weight) : null,
    categoryId: optStr(fd, "categoryId"),
    isActive: fd.get("isActive") === "on",
    isFeatured: fd.get("isFeatured") === "on",
    ingredients: optStr(fd, "ingredients"),
    allergens: optStr(fd, "allergens"),
    mayContain: optStr(fd, "mayContain"),
    nutrition: optStr(fd, "nutrition"),
    storageInfo: optStr(fd, "storageInfo"),
    origin: optStr(fd, "origin"),
    seoTitle: optStr(fd, "seoTitle"),
    seoDescription: optStr(fd, "seoDescription"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." } as const;
  return { data: parsed.data } as const;
}

export async function createProduct(fd: FormData) {
  const admin = await assertAdmin();
  const r = parseProduct(fd);
  if ("error" in r) fail("/admin/produits/nouveau", r.error!);
  const d = r.data;
  if (await db.product.findUnique({ where: { slug: d.slug } })) fail("/admin/produits/nouveau", "Cette adresse (slug) est déjà utilisée par un autre produit.");
  const stock = Number(str(fd, "initialStock") || "0");
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) fail("/admin/produits/nouveau", "Stock initial invalide.");
  const product = await db.$transaction(async (tx) => {
    const p = await tx.product.create({ data: { ...d, stock } });
    if (stock > 0) await tx.stockMovement.create({ data: { productId: p.id, delta: stock, reason: "ADMIN_ADJUSTMENT", actorId: admin.id, note: "Stock initial" } });
    return p;
  });
  await audit(admin.id, "product.create", "Product", product.id, { name: d.name });
  revalidatePath("/", "layout");
  done(`/admin/produits/${product.id}`, "Produit créé. Ajoutez maintenant ses photos.");
}

export async function updateProduct(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const back = `/admin/produits/${id}`;
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) fail("/admin/produits", "Produit introuvable.");
  const r = parseProduct(fd);
  if ("error" in r) fail(back, r.error!);
  const d = r.data;
  const clash = await db.product.findFirst({ where: { slug: d.slug, id: { not: id } } });
  if (clash) fail(back, "Cette adresse (slug) est déjà utilisée par un autre produit.");
  await db.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: d });
    if (existing.slug !== d.slug) await recordRedirect(tx, `/produit/${existing.slug}`, `/produit/${d.slug}`);
  });
  const changes: Record<string, unknown> = {};
  if (existing.priceCents !== d.priceCents) changes.price = [existing.priceCents, d.priceCents];
  if (existing.isActive !== d.isActive) changes.isActive = d.isActive;
  if (existing.slug !== d.slug) changes.slug = [existing.slug, d.slug];
  await audit(admin.id, "product.update", "Product", id, changes as never);
  revalidatePath("/", "layout");
  done(back, "Produit enregistré.");
}

export async function adjustStock(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const back = `/admin/produits/${id}`;
  const delta = Number(str(fd, "delta"));
  const note = optStr(fd, "note");
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) fail(back, "Indiquez une quantité entière non nulle (ex. 20 ou -3).");
  const ok = await db.$transaction(async (tx) => {
    const res = await tx.product.updateMany({ where: { id, ...(delta < 0 ? { stock: { gte: -delta } } : {}) }, data: { stock: { increment: delta } } });
    if (res.count !== 1) return false;
    await tx.stockMovement.create({ data: { productId: id, delta, reason: "ADMIN_ADJUSTMENT", actorId: admin.id, note } });
    return true;
  });
  if (!ok) fail(back, "Le stock ne peut pas devenir négatif.");
  await audit(admin.id, "product.stock_adjust", "Product", id, { delta, note });
  revalidatePath("/", "layout");
  done(back, `Stock ajusté (${delta > 0 ? "+" : ""}${delta}).`);
}

export async function uploadProductImages(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const back = `/admin/produits/${id}`;
  const product = await db.product.findUnique({ where: { id }, include: { _count: { select: { images: true } } } });
  if (!product) fail("/admin/produits", "Produit introuvable.");
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const alt = str(fd, "alt") || product.name;
  if (files.length === 0) fail(back, "Choisissez au moins une photo.");
  if (product._count.images + files.length > 8) fail(back, "8 photos maximum par produit.");
  let pos = product._count.images;
  for (const file of files) {
    const saved = await saveUpload(file, "products", PRODUCT_IMAGE_TYPES);
    if (!saved.ok) fail(back, `${file.name} : ${saved.error}`);
    await db.productImage.create({ data: { productId: id, storageKey: saved.key, alt: alt.slice(0, 160), position: pos++ } });
  }
  await audit(admin.id, "product.images_upload", "Product", id, { count: files.length });
  revalidatePath("/", "layout");
  done(back, `${files.length} photo(s) ajoutée(s).`);
}

export async function updateImage(fd: FormData) {
  const admin = await assertAdmin();
  const imageId = str(fd, "imageId");
  const img = await db.productImage.findUnique({ where: { id: imageId } });
  if (!img) fail("/admin/produits", "Photo introuvable.");
  const back = `/admin/produits/${img.productId}`;
  const op = str(fd, "op");
  if (op === "delete") {
    await db.productImage.delete({ where: { id: imageId } });
    await deleteStored(img.storageKey);
    await audit(admin.id, "product.image_delete", "Product", img.productId);
  } else if (op === "first") {
    await db.$transaction(async (tx) => {
      await tx.productImage.updateMany({ where: { productId: img.productId }, data: { position: { increment: 1 } } });
      await tx.productImage.update({ where: { id: imageId }, data: { position: 0 } });
    });
  } else if (op === "alt") {
    const alt = str(fd, "alt");
    if (!alt) fail(back, "Le texte alternatif ne peut pas être vide.");
    await db.productImage.update({ where: { id: imageId }, data: { alt: alt.slice(0, 160) } });
  }
  revalidatePath("/", "layout");
  done(back, "Photo mise à jour.");
}

export async function setRelatedProducts(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const ids = fd.getAll("related").filter((v): v is string => typeof v === "string" && v !== id).slice(0, 8);
  await db.$transaction(async (tx) => {
    await tx.productRelation.deleteMany({ where: { fromId: id } });
    if (ids.length) await tx.productRelation.createMany({ data: ids.map((toId) => ({ fromId: id, toId })), skipDuplicates: true });
  });
  await audit(admin.id, "product.related_update", "Product", id, { count: ids.length });
  revalidatePath("/", "layout");
  done(`/admin/produits/${id}`, "Produits complémentaires enregistrés.");
}

export async function deleteProduct(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const product = await db.product.findUnique({ where: { id }, include: { images: true, _count: { select: { orderItems: true } } } });
  if (!product) fail("/admin/produits", "Produit introuvable.");
  if (product._count.orderItems > 0) {
    await db.product.update({ where: { id }, data: { isActive: false } });
    await audit(admin.id, "product.deactivate", "Product", id);
    revalidatePath("/", "layout");
    done(`/admin/produits/${id}`, "Ce produit figure dans des commandes : il a été désactivé au lieu d'être supprimé.");
  }
  await db.product.delete({ where: { id } });
  for (const img of product.images) await deleteStored(img.storageKey);
  await audit(admin.id, "product.delete", "Product", id, { name: product.name });
  revalidatePath("/", "layout");
  done("/admin/produits", "Produit supprimé.");
}
