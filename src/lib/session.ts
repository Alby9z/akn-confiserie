import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Session courante (ou null). Mise en cache pour la durée d'un rendu. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Utilisateur courant relu en base : le rôle fait foi depuis la base, jamais depuis le client. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, firstName: true, lastName: true, phone: true, role: true, emailVerified: true, marketingOptIn: true, deletionRequestedAt: true },
  });
});

export async function requireUser(returnTo = "/compte") {
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?retour=${encodeURIComponent(returnTo)}`);
  return user;
}

/** Garde d'accès administrateur : utilisée par chaque page ET chaque action d'administration. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?retour=/admin");
  if (user.role !== "ADMIN") notFound();
  return user;
}

/** Variante pour les Server Actions : lève une erreur au lieu de rediriger. */
export async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}
