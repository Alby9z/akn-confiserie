"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { done, fail, optStr, str } from "@/lib/admin-redirect";
import { parsePriceToCents } from "@/lib/money";
import { sendEmail } from "@/lib/email/send";
import { requestReplyEmail } from "@/lib/email/templates";
import { CustomRequestStatus } from "@/generated/prisma/enums";
import { REQUEST_STATUS_LABELS } from "@/lib/request-status";

export async function setRequestStatus(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const back = `/admin/demandes/${id}`;
  const to = str(fd, "status") as CustomRequestStatus;
  if (!Object.values(CustomRequestStatus).includes(to)) fail(back, "Statut inconnu.");
  const r = await db.customRequest.findUnique({ where: { id } });
  if (!r) fail("/admin/demandes", "Demande introuvable.");
  await db.$transaction([
    db.customRequest.update({ where: { id }, data: { status: to } }),
    db.customRequestMessage.create({ data: { requestId: id, author: "SYSTEM", authorId: admin.id, isInternal: true, body: `Statut : ${REQUEST_STATUS_LABELS[r.status]} → ${REQUEST_STATUS_LABELS[to]}` } }),
  ]);
  await audit(admin.id, "request.status_change", "CustomRequest", id, { from: r.status, to });
  revalidatePath(back);
  done(back, "Statut mis à jour.");
}

export async function addInternalNote(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const back = `/admin/demandes/${id}`;
  const body = str(fd, "body");
  if (!body || body.length > 4000) fail(back, "Note vide ou trop longue.");
  await db.customRequestMessage.create({ data: { requestId: id, author: "ADMIN", authorId: admin.id, isInternal: true, body } });
  revalidatePath(back);
  done(back, "Note ajoutée.");
}

/** Envoie une réponse (et éventuellement un devis) au client par e-mail. Ne valide jamais la commande automatiquement. */
export async function replyToRequest(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const back = `/admin/demandes/${id}`;
  const r = await db.customRequest.findUnique({ where: { id } });
  if (!r) fail("/admin/demandes", "Demande introuvable.");
  const message = str(fd, "message");
  if (message.length < 5 || message.length > 6000) fail(back, "Message trop court ou trop long.");
  const quoteRaw = optStr(fd, "quote");
  const quote = quoteRaw ? parsePriceToCents(quoteRaw) : null;
  if (quoteRaw && quote == null) fail(back, "Montant du devis invalide (ex. 120,00).");
  const mail = requestReplyEmail({ reference: r.reference, fullName: r.fullName, message, quotedAmountCents: quote });
  const sent = await sendEmail({ to: r.email, ...mail, template: "request_reply" });
  await db.$transaction([
    db.customRequestMessage.create({ data: { requestId: id, author: "ADMIN", authorId: admin.id, body: message + (quote != null ? `\n\nMontant proposé : ${(quote / 100).toFixed(2).replace(".", ",")} € TTC` : ""), emailSent: sent.sent } }),
    db.customRequest.update({ where: { id }, data: { ...(quote != null ? { quotedAmountCents: quote, status: "QUOTE_SENT" } : r.status === "NEW" ? { status: "REVIEWING" } : {}) } }),
  ]);
  await audit(admin.id, "request.reply", "CustomRequest", id, { emailSent: sent.sent, quote });
  revalidatePath(back);
  if (!sent.sent) fail(back, "Réponse enregistrée, mais l'e-mail n'a PAS pu être envoyé (service e-mail non configuré ou en erreur). Contactez le client par téléphone.");
  done(back, "Réponse envoyée par e-mail.");
}
