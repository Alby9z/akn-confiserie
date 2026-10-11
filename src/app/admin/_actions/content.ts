"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { done, fail, optStr, str } from "@/lib/admin-redirect";
import { parsePriceToCents } from "@/lib/money";
import { LegalSlug } from "@/generated/prisma/enums";

const BACK = "/admin/contenu";

const urlOrNull = z.string().url("Lien invalide (doit commencer par https://).").startsWith("https://", "Le lien doit commencer par https://").nullable();

export async function saveSettings(fd: FormData) {
  const admin = await assertAdmin();
  const fee = optStr(fd, "deliveryFee");
  const free = optStr(fd, "freeDeliveryThreshold");
  const deliveryFeeCents = fee ? parsePriceToCents(fee) : null;
  const freeDeliveryThresholdCents = free ? parsePriceToCents(free) : null;
  if (fee && deliveryFeeCents == null) fail(BACK, "Frais de livraison invalides.");
  if (free && freeDeliveryThresholdCents == null) fail(BACK, "Seuil de livraison offerte invalide.");
  const deliveryEnabled = fd.get("deliveryEnabled") === "on";
  if (deliveryEnabled && deliveryFeeCents == null) fail(BACK, "Pour activer la livraison, indiquez ses frais (0 si gratuite).");
  const lat = optStr(fd, "mapLatitude");
  const lon = optStr(fd, "mapLongitude");
  const mapLatitude = lat ? Number(lat.replace(",", ".")) : null;
  const mapLongitude = lon ? Number(lon.replace(",", ".")) : null;
  if ((lat && (Number.isNaN(mapLatitude) || Math.abs(mapLatitude!) > 90)) || (lon && (Number.isNaN(mapLongitude) || Math.abs(mapLongitude!) > 180))) fail(BACK, "Coordonnées GPS invalides.");
  const email = optStr(fd, "email");
  if (email && !z.string().email().safeParse(email).success) fail(BACK, "Adresse e-mail invalide.");
  const insta = urlOrNull.safeParse(optStr(fd, "instagramUrl"));
  const fb = urlOrNull.safeParse(optStr(fd, "facebookUrl"));
  if (!insta.success || !fb.success) fail(BACK, "Liens des réseaux sociaux invalides (https://…).");
  const limit = (v: string | null, n: number) => (v ? v.slice(0, n) : null);
  const data = {
    shopName: str(fd, "shopName").slice(0, 80) || "AKN Confiserie 90",
    contactName: limit(optStr(fd, "contactName"), 80),
    email,
    phone: limit(optStr(fd, "phone"), 30),
    addressLine: limit(optStr(fd, "addressLine"), 120),
    postalCode: limit(optStr(fd, "postalCode"), 10),
    city: limit(optStr(fd, "city"), 80),
    openingHours: limit(optStr(fd, "openingHours"), 600),
    mapLatitude,
    mapLongitude,
    heroTitle: limit(optStr(fd, "heroTitle"), 120),
    heroText: limit(optStr(fd, "heroText"), 400),
    aboutText: limit(optStr(fd, "aboutText"), 4000),
    announcement: limit(optStr(fd, "announcement"), 160),
    pickupEnabled: fd.get("pickupEnabled") === "on",
    pickupInfo: limit(optStr(fd, "pickupInfo"), 600),
    deliveryEnabled,
    deliveryFeeCents,
    freeDeliveryThresholdCents,
    deliveryInfo: limit(optStr(fd, "deliveryInfo"), 600),
    responsePromise: limit(optStr(fd, "responsePromise"), 160),
    instagramUrl: insta.data,
    facebookUrl: fb.data,
  };
  await db.siteSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  await audit(admin.id, "settings.update", "SiteSettings", "1", { pickupEnabled: data.pickupEnabled, deliveryEnabled });
  revalidatePath("/", "layout");
  done(BACK, "Paramètres enregistrés.");
}

export async function saveFaq(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const question = str(fd, "question");
  const answer = str(fd, "answer");
  if (question.length < 3 || question.length > 300 || answer.length < 2 || answer.length > 4000) fail(BACK, "Question ou réponse invalide.");
  const data = { question, answer, isPublished: fd.get("isPublished") === "on", showOnHome: fd.get("showOnHome") === "on", position: Number(str(fd, "position") || "0") || 0 };
  if (id) await db.faq.update({ where: { id }, data });
  else await db.faq.create({ data });
  await audit(admin.id, id ? "faq.update" : "faq.create", "Faq", id || null);
  revalidatePath("/", "layout");
  done(BACK, "Question enregistrée.");
}

export async function deleteFaq(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  await db.faq.deleteMany({ where: { id } });
  await audit(admin.id, "faq.delete", "Faq", id);
  revalidatePath("/", "layout");
  done(BACK, "Question supprimée.");
}

export async function saveLegalPage(fd: FormData) {
  const admin = await assertAdmin();
  const slug = str(fd, "slug") as LegalSlug;
  const back = "/admin/pages-legales";
  if (!Object.values(LegalSlug).includes(slug)) fail(back, "Page inconnue.");
  const content = str(fd, "content");
  const title = str(fd, "title");
  if (!title || content.length < 20 || content.length > 60000) fail(back, "Contenu invalide.");
  const validate = fd.get("isValidated") === "on";
  if (validate && content.includes("[À COMPLÉTER")) fail(back, "Impossible de marquer comme validée : il reste des passages « [À COMPLÉTER] ».");
  const existing = await db.legalPage.findUnique({ where: { slug } });
  await db.legalPage.update({
    where: { slug },
    data: { title, content, isValidated: validate, validatedAt: validate ? (existing?.isValidated && existing.content === content ? existing.validatedAt : new Date()) : null },
  });
  await audit(admin.id, "legal.update", "LegalPage", slug, { isValidated: validate });
  revalidatePath("/", "layout");
  done(back, "Page enregistrée.");
}
