import "server-only";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { maskEmail } from "@/lib/utils";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export type SendResult = { sent: boolean; reason?: string };

/**
 * Envoie un e-mail transactionnel via Resend.
 * Sans clé (développement uniquement), l'e-mail n'est PAS envoyé : il est affiché
 * dans la console et journalisé avec le statut SKIPPED_NO_PROVIDER.
 */
export async function sendEmail(input: { to: string; subject: string; html: string; text: string; template: string; replyTo?: string }): Promise<SendResult> {
  const toMasked = maskEmail(input.to);
  if (!resend) {
    console.warn(`[e-mail NON envoyé — RESEND_API_KEY absente] ${input.template} → ${toMasked}\n${input.text}\n`);
    await db.emailLog.create({ data: { toMasked, template: input.template, status: "SKIPPED_NO_PROVIDER" } }).catch(() => {});
    return { sent: false, reason: "no_provider" };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    if (error) throw new Error(error.message);
    await db.emailLog.create({ data: { toMasked, template: input.template, status: "SENT", providerId: data?.id } });
    return { sent: true };
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 300) : "unknown";
    console.error(`[e-mail] échec ${input.template} → ${toMasked}: ${message}`);
    await db.emailLog.create({ data: { toMasked, template: input.template, status: "FAILED", error: message } }).catch(() => {});
    return { sent: false, reason: "provider_error" };
  }
}

export async function notifyAdmin(input: { subject: string; html: string; text: string; template: string; replyTo?: string }) {
  if (!env.ADMIN_NOTIFICATION_EMAIL) {
    console.warn(`[notification admin non envoyée — ADMIN_NOTIFICATION_EMAIL absente] ${input.subject}`);
    return { sent: false, reason: "no_admin_email" };
  }
  return sendEmail({ ...input, to: env.ADMIN_NOTIFICATION_EMAIL });
}
