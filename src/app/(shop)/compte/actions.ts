"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { notifyAdmin } from "@/lib/email/send";
import { adminDeletionRequestEmail } from "@/lib/email/templates";
import { addressSchema, frPhoneSchema } from "@/lib/validation/schemas";

export type ActionResult = { ok: boolean; message?: string; fields?: Record<string, string[] | undefined> };

async function me() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function toggleFavorite(productId: string) {
  const user = await me();
  if (typeof productId !== "string" || productId.length > 40) return;
  const existing = await db.favorite.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  if (existing) await db.favorite.delete({ where: { userId_productId: { userId: user.id, productId } } });
  else if (await db.product.findFirst({ where: { id: productId, isActive: true }, select: { id: true } })) await db.favorite.create({ data: { userId: user.id, productId } });
  revalidatePath("/compte/favoris");
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est obligatoire.").max(60),
  lastName: z.string().trim().min(1, "Le nom est obligatoire.").max(60),
  phone: frPhoneSchema.optional().or(z.literal("")),
});

export async function updateProfile(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await me();
  const parsed = profileSchema.safeParse({ firstName: fd.get("firstName"), lastName: fd.get("lastName"), phone: fd.get("phone") ?? "" });
  if (!parsed.success) return { ok: false, message: "Certains champs sont à corriger.", fields: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  await db.user.update({ where: { id: user.id }, data: { firstName: d.firstName, lastName: d.lastName, name: `${d.firstName} ${d.lastName}`, phone: d.phone || null } });
  revalidatePath("/compte");
  return { ok: true, message: "Informations enregistrées." };
}

export async function saveAddress(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await me();
  const id = fd.get("id");
  const parsed = addressSchema.extend({ label: z.string().trim().max(40).optional().or(z.literal("")), phone: frPhoneSchema.optional().or(z.literal("")) }).safeParse({
    fullName: fd.get("fullName"),
    line1: fd.get("line1"),
    line2: fd.get("line2") ?? "",
    postalCode: fd.get("postalCode"),
    city: fd.get("city"),
    label: fd.get("label") ?? "",
    phone: fd.get("phone") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Certains champs sont à corriger.", fields: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  const isDefault = fd.get("isDefault") === "on";
  const data = { fullName: d.fullName, line1: d.line1, line2: d.line2 || null, postalCode: d.postalCode, city: d.city, label: d.label || null, phone: d.phone || null, isDefault };
  await db.$transaction(async (tx) => {
    if (isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    if (typeof id === "string" && id) {
      // updateMany avec userId : impossible de modifier l'adresse d'un autre client
      const res = await tx.address.updateMany({ where: { id, userId: user.id }, data });
      if (res.count !== 1) throw new Error("NOT_FOUND");
    } else {
      const count = await tx.address.count({ where: { userId: user.id } });
      if (count >= 10) throw new Error("LIMIT");
      await tx.address.create({ data: { ...data, userId: user.id, isDefault: isDefault || count === 0 } });
    }
  });
  revalidatePath("/compte/adresses");
  return { ok: true, message: "Adresse enregistrée." };
}

export async function deleteAddress(id: string) {
  const user = await me();
  await db.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/compte/adresses");
}

export async function updatePreferences(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await me();
  await db.user.update({ where: { id: user.id }, data: { marketingOptIn: fd.get("marketingOptIn") === "on" } });
  revalidatePath("/compte/preferences");
  return { ok: true, message: "Préférences enregistrées." };
}

export async function revokeSession(token: string) {
  await me();
  await auth.api.revokeSession({ body: { token }, headers: await headers() });
  revalidatePath("/compte/securite");
}

export async function revokeOtherSessions() {
  await me();
  await auth.api.revokeOtherSessions({ headers: await headers() });
  revalidatePath("/compte/securite");
}

export async function changePassword(_: ActionResult, fd: FormData): Promise<ActionResult> {
  await me();
  const current = String(fd.get("currentPassword") ?? "");
  const next = String(fd.get("newPassword") ?? "");
  const confirm = String(fd.get("confirmPassword") ?? "");
  if (next.length < 10 || !/[a-zA-Z]/.test(next) || !/\d/.test(next)) return { ok: false, fields: { newPassword: ["10 caractères minimum, avec au moins une lettre et un chiffre."] } };
  if (next !== confirm) return { ok: false, fields: { confirmPassword: ["Les mots de passe ne correspondent pas."] } };
  try {
    await auth.api.changePassword({ body: { currentPassword: current, newPassword: next, revokeOtherSessions: true }, headers: await headers() });
    return { ok: true, message: "Mot de passe modifié. Vos autres appareils ont été déconnectés." };
  } catch {
    return { ok: false, fields: { currentPassword: ["Mot de passe actuel incorrect."] } };
  }
}

/** Demande de suppression : traitée par la boutique (obligations de conservation des factures). */
export async function requestAccountDeletion(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await me();
  if (fd.get("confirm") !== "SUPPRIMER") return { ok: false, fields: { confirm: ["Tapez SUPPRIMER pour confirmer."] } };
  if (user.deletionRequestedAt) return { ok: true, message: "Votre demande est déjà enregistrée." };
  await db.user.update({ where: { id: user.id }, data: { deletionRequestedAt: new Date(), marketingOptIn: false } });
  await audit(user.id, "account.deletion_requested", "User", user.id);
  await notifyAdmin({ ...adminDeletionRequestEmail({ email: user.email, url: `${appUrl}/admin/clients/${user.id}` }), template: "admin_deletion_request" });
  revalidatePath("/compte");
  return { ok: true, message: "Demande enregistrée. Nous vous confirmerons la suppression par e-mail." };
}
