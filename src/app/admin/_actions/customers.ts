"use server";

import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { done, fail, str } from "@/lib/admin-redirect";
import { sendEmail } from "@/lib/email/send";

/**
 * Suppression du compte client : efface le compte, les sessions, adresses, favoris et panier.
 * Les commandes conservent leur instantané (obligations comptables) mais ne sont plus reliées au compte.
 */
export async function deleteCustomer(fd: FormData) {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  const back = `/admin/clients/${id}`;
  if (id === admin.id) fail(back, "Vous ne pouvez pas supprimer votre propre compte administrateur ici.");
  if (str(fd, "confirm") !== "SUPPRIMER") fail(back, "Tapez SUPPRIMER pour confirmer.");
  const user = await db.user.findUnique({ where: { id } });
  if (!user) fail("/admin/clients", "Client introuvable.");
  if (user.role === "ADMIN") fail(back, "Retirez d'abord le rôle administrateur.");
  await db.user.delete({ where: { id } });
  await audit(admin.id, "customer.delete", "User", id, { hadDeletionRequest: Boolean(user.deletionRequestedAt) });
  await sendEmail({
    to: user.email,
    subject: "Votre compte a été supprimé — AKN Confiserie 90",
    text: "Bonjour,\n\nConformément à votre demande, votre compte client a été supprimé. Les informations des commandes passées sont conservées uniquement pour la durée imposée par les obligations comptables.\n\nAKN Confiserie 90",
    html: "<p>Bonjour,</p><p>Conformément à votre demande, votre compte client a été supprimé. Les informations des commandes passées sont conservées uniquement pour la durée imposée par les obligations comptables.</p><p>AKN Confiserie 90</p>",
    template: "account_deleted",
  });
  done("/admin/clients", "Compte client supprimé.");
}
