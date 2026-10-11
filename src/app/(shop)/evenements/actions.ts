"use server";

import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { getClientIp, readableReference } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { saveUpload } from "@/lib/storage";
import { notifyAdmin, sendEmail } from "@/lib/email/send";
import { adminNewRequestEmail, requestReceivedEmail } from "@/lib/email/templates";
import { customRequestSchema, EVENT_TYPES, REQUEST_ATTACHMENT_TYPES } from "@/lib/validation/schemas";

export type RequestState =
  | { status: "idle" }
  | { status: "error"; message: string; fields?: Record<string, string[] | undefined> }
  | { status: "success"; reference: string; responsePromise: string | null };

export async function submitCustomRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const ip = await getClientIp();
  if (!(await rateLimit(`request:${ip}`, 5, 3600))) {
    return { status: "error", message: "Vous avez envoyé plusieurs demandes récemment. Réessayez dans une heure ou appelez la boutique." };
  }
  // Robot (champ piège rempli) : on simule un succès sans rien enregistrer ni envoyer
  const trap = formData.get("website");
  if (typeof trap === "string" && trap.trim() !== "") return { status: "success", reference: "DEM-RECUE", responsePromise: null };
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = customRequestSchema.safeParse({ ...raw, consent: formData.get("consent") === "on" });
  if (!parsed.success) {
    return { status: "error", message: "Certains champs sont à corriger.", fields: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  let attachment: { key: string; name: string; mime: string; size: number } | null = null;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    const saved = await saveUpload(file, "requests", REQUEST_ATTACHMENT_TYPES);
    if (!saved.ok) return { status: "error", message: saved.error, fields: { attachment: [saved.error] } };
    attachment = { key: saved.key, name: file.name.slice(0, 120).replace(/[^\p{L}\p{N}._ -]/gu, "_"), mime: saved.mime, size: saved.size };
  }

  const session = await getSession();
  let reference = readableReference("DEM");
  for (let i = 0; i < 3 && (await db.customRequest.findUnique({ where: { reference } })); i++) reference = readableReference("DEM");

  const created = await db.customRequest.create({
    data: {
      reference,
      userId: session?.user.id ?? null,
      fullName: d.fullName,
      email: d.email,
      phone: d.phone,
      eventType: d.eventType,
      eventDate: d.eventDate ? new Date(`${d.eventDate}T12:00:00`) : null,
      guestCount: d.guestCount ? Number(d.guestCount) : null,
      quantity: d.quantity || null,
      budget: d.budget || null,
      preferences: d.preferences || null,
      description: d.description,
      attachmentKey: attachment?.key ?? null,
      attachmentName: attachment?.name ?? null,
      attachmentMime: attachment?.mime ?? null,
      attachmentSize: attachment?.size ?? null,
      messages: { create: { author: "SYSTEM", body: "Demande reçue via le site." } },
    },
  });

  const settings = await getSettings();
  await sendEmail({ to: d.email, ...requestReceivedEmail({ reference, fullName: d.fullName, responsePromise: settings.responsePromise }), template: "request_received" });
  await notifyAdmin({
    ...adminNewRequestEmail({
      reference,
      fullName: d.fullName,
      email: d.email,
      phone: d.phone,
      eventLabel: EVENT_TYPES[d.eventType],
      eventDate: d.eventDate ? new Date(d.eventDate).toLocaleDateString("fr-FR") : null,
      description: d.description,
      url: `${appUrl}/admin/demandes/${created.id}`,
    }),
    replyTo: d.email,
    template: "admin_new_request",
  });
  return { status: "success", reference, responsePromise: settings.responsePromise };
}
