import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { OrderStatus } from "@/generated/prisma/enums";

const SHOP = "AKN Confiserie 90";

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#fbf6f1;font-family:Arial,Helvetica,sans-serif;color:#24151d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#160b12;padding:20px 28px;color:#f3c867;font-size:20px;font-weight:bold;letter-spacing:.5px">${SHOP}</td></tr>
<tr><td style="padding:28px"><h1 style="font-size:20px;margin:0 0 16px;color:#b8115f">${escapeHtml(title)}</h1>${body}</td></tr>
<tr><td style="padding:16px 28px;background:#fbf6f1;font-size:12px;color:#6b5560">Ce message vous est envoyé par ${SHOP}, 23 boulevard Joffre, 90000 Belfort.</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="background:#d61f7e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;display:inline-block">${escapeHtml(label)}</a></p>`;
}

type Mail = { subject: string; html: string; text: string };

export function verificationEmail(name: string, url: string): Mail {
  return {
    subject: `Confirmez votre adresse e-mail — ${SHOP}`,
    html: layout("Confirmez votre adresse e-mail", `<p>Bonjour ${escapeHtml(name)},</p><p>Merci pour votre inscription. Cliquez sur le bouton ci-dessous pour confirmer votre adresse e-mail. Ce lien est valable 1 heure.</p>${button(url, "Confirmer mon adresse")}<p style="font-size:13px;color:#6b5560">Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.</p>`),
    text: `Bonjour ${name},\n\nConfirmez votre adresse e-mail (lien valable 1 heure) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`,
  };
}

export function resetPasswordEmail(name: string, url: string): Mail {
  return {
    subject: `Réinitialisation de votre mot de passe — ${SHOP}`,
    html: layout("Réinitialiser votre mot de passe", `<p>Bonjour ${escapeHtml(name)},</p><p>Une demande de réinitialisation de mot de passe a été faite pour votre compte. Ce lien est valable 1 heure.</p>${button(url, "Choisir un nouveau mot de passe")}<p style="font-size:13px;color:#6b5560">Si vous n'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.</p>`),
    text: `Bonjour ${name},\n\nRéinitialisez votre mot de passe (lien valable 1 heure) :\n${url}\n\nSi vous n'avez rien demandé, ignorez ce message.`,
  };
}

type OrderMailData = {
  ref: string;
  firstName: string;
  items: { productName: string; quantity: number; lineTotalCents: number }[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  fulfillment: "PICKUP" | "DELIVERY";
  url: string;
};

function orderTable(o: OrderMailData) {
  const rows = o.items
    .map((i) => `<tr><td style="padding:6px 0">${escapeHtml(i.productName)} × ${i.quantity}</td><td align="right">${formatPrice(i.lineTotalCents)}</td></tr>`)
    .join("");
  const extra = [
    o.discountCents > 0 ? `<tr><td>Réduction</td><td align="right">− ${formatPrice(o.discountCents)}</td></tr>` : "",
    o.fulfillment === "DELIVERY" ? `<tr><td>Livraison</td><td align="right">${o.shippingCents === 0 ? "Offerte" : formatPrice(o.shippingCents)}</td></tr>` : `<tr><td>Retrait en boutique</td><td align="right">Gratuit</td></tr>`,
  ].join("");
  return `<table width="100%" style="border-collapse:collapse;font-size:14px">${rows}<tr><td colspan="2"><hr style="border:none;border-top:1px solid #eadfe4"></td></tr><tr><td>Sous-total</td><td align="right">${formatPrice(o.subtotalCents)}</td></tr>${extra}<tr><td style="font-weight:bold;padding-top:8px">Total TTC</td><td align="right" style="font-weight:bold;padding-top:8px">${formatPrice(o.totalCents)}</td></tr></table>`;
}

function orderText(o: OrderMailData) {
  return [
    ...o.items.map((i) => `- ${i.productName} × ${i.quantity} : ${formatPrice(i.lineTotalCents)}`),
    `Sous-total : ${formatPrice(o.subtotalCents)}`,
    o.discountCents > 0 ? `Réduction : -${formatPrice(o.discountCents)}` : null,
    o.fulfillment === "DELIVERY" ? `Livraison : ${formatPrice(o.shippingCents)}` : "Retrait en boutique",
    `Total TTC : ${formatPrice(o.totalCents)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function orderConfirmationEmail(o: OrderMailData): Mail {
  const next =
    o.fulfillment === "PICKUP"
      ? "Nous vous préviendrons par e-mail dès que votre commande sera prête au retrait en boutique."
      : "Nous vous préviendrons par e-mail lors de l'expédition de votre commande.";
  return {
    subject: `Commande ${o.ref} confirmée — ${SHOP}`,
    html: layout(`Merci pour votre commande ${o.ref} !`, `<p>Bonjour ${escapeHtml(o.firstName)},</p><p>Votre paiement a bien été reçu. ${next}</p>${orderTable(o)}${button(o.url, "Suivre ma commande")}`),
    text: `Bonjour ${o.firstName},\n\nVotre paiement pour la commande ${o.ref} a bien été reçu. ${next}\n\n${orderText(o)}\n\nSuivre ma commande : ${o.url}`,
  };
}

export function adminNewOrderEmail(o: OrderMailData & { customer: string; email: string }): Mail {
  return {
    subject: `Nouvelle commande payée ${o.ref} — ${formatPrice(o.totalCents)}`,
    html: layout(`Nouvelle commande ${o.ref}`, `<p>Client : ${escapeHtml(o.customer)} (${escapeHtml(o.email)})</p><p>Mode : ${o.fulfillment === "PICKUP" ? "Retrait en boutique" : "Livraison"}</p>${orderTable(o)}${button(o.url, "Ouvrir dans l'administration")}`),
    text: `Nouvelle commande payée ${o.ref}\nClient : ${o.customer} (${o.email})\n\n${orderText(o)}\n\n${o.url}`,
  };
}

export function orderStatusEmail(input: { ref: string; firstName: string; status: OrderStatus; url: string; pickupInfo?: string | null }): Mail {
  const label = ORDER_STATUS_LABELS[input.status];
  const extra =
    input.status === "READY_FOR_PICKUP" && input.pickupInfo ? `<p>${escapeHtml(input.pickupInfo)}</p>` : "";
  return {
    subject: `Commande ${input.ref} : ${label} — ${SHOP}`,
    html: layout(`Votre commande ${input.ref}`, `<p>Bonjour ${escapeHtml(input.firstName)},</p><p>Le statut de votre commande est désormais : <strong>${escapeHtml(label)}</strong>.</p>${extra}${button(input.url, "Voir ma commande")}`),
    text: `Bonjour ${input.firstName},\n\nLe statut de votre commande ${input.ref} est désormais : ${label}.\n${input.status === "READY_FOR_PICKUP" && input.pickupInfo ? input.pickupInfo + "\n" : ""}\n${input.url}`,
  };
}

export function requestReceivedEmail(input: { reference: string; fullName: string; responsePromise?: string | null }): Mail {
  const promise = input.responsePromise ? ` ${input.responsePromise}` : " Nous revenons vers vous dès que possible.";
  return {
    subject: `Demande ${input.reference} bien reçue — ${SHOP}`,
    html: layout("Votre demande est bien reçue", `<p>Bonjour ${escapeHtml(input.fullName)},</p><p>Nous avons bien reçu votre demande <strong>${escapeHtml(input.reference)}</strong>.${escapeHtml(promise)}</p><p>Votre demande sera étudiée avant toute confirmation : aucun prix ni aucune disponibilité ne sont garantis tant que nous ne vous avons pas adressé de proposition.</p>`),
    text: `Bonjour ${input.fullName},\n\nNous avons bien reçu votre demande ${input.reference}.${promise}\n\nVotre demande sera étudiée avant toute confirmation : aucun prix ni aucune disponibilité ne sont garantis tant que nous ne vous avons pas adressé de proposition.`,
  };
}

export function adminNewRequestEmail(input: { reference: string; fullName: string; email: string; phone: string; eventLabel: string; eventDate?: string | null; description: string; url: string }): Mail {
  return {
    subject: `Nouvelle demande ${input.reference} — ${input.eventLabel}`,
    html: layout(`Nouvelle demande ${input.reference}`, `<p><strong>${escapeHtml(input.fullName)}</strong> — ${escapeHtml(input.email)} — ${escapeHtml(input.phone)}</p><p>Type : ${escapeHtml(input.eventLabel)}${input.eventDate ? ` — le ${escapeHtml(input.eventDate)}` : ""}</p><p style="white-space:pre-wrap">${escapeHtml(input.description)}</p>${button(input.url, "Traiter la demande")}`),
    text: `Nouvelle demande ${input.reference}\n${input.fullName} — ${input.email} — ${input.phone}\nType : ${input.eventLabel}${input.eventDate ? ` — le ${input.eventDate}` : ""}\n\n${input.description}\n\n${input.url}`,
  };
}

export function requestReplyEmail(input: { reference: string; fullName: string; message: string; quotedAmountCents?: number | null }): Mail {
  const quote = input.quotedAmountCents != null ? `<p>Montant proposé : <strong>${formatPrice(input.quotedAmountCents)} TTC</strong></p>` : "";
  return {
    subject: `Réponse à votre demande ${input.reference} — ${SHOP}`,
    html: layout(`Votre demande ${input.reference}`, `<p>Bonjour ${escapeHtml(input.fullName)},</p><p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>${quote}<p>Vous pouvez répondre directement à cet e-mail ou nous appeler au 07 66 39 47 84.</p>`),
    text: `Bonjour ${input.fullName},\n\n${input.message}\n${input.quotedAmountCents != null ? `\nMontant proposé : ${formatPrice(input.quotedAmountCents)} TTC\n` : ""}\nVous pouvez répondre directement à cet e-mail ou nous appeler au 07 66 39 47 84.`,
  };
}

export function adminDeletionRequestEmail(input: { email: string; url: string }): Mail {
  return {
    subject: `Demande de suppression de compte`,
    html: layout("Demande de suppression de compte", `<p>Le client ${escapeHtml(input.email)} demande la suppression de son compte.</p>${button(input.url, "Traiter la demande")}`),
    text: `Le client ${input.email} demande la suppression de son compte.\n${input.url}`,
  };
}
