/**
 * Donne le rôle administrateur à un compte EXISTANT et VÉRIFIÉ.
 * Procédure : 1) créer le compte normalement sur /inscription, 2) confirmer l'e-mail,
 * 3) exécuter : npm run admin:promote -- adresse@exemple.fr
 * Aucun mot de passe n'est jamais saisi ni stocké par ce script.
 */
import { existsSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (existsSync(".env")) process.loadEnvFile(".env");

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email) {
    console.error("Usage : npm run admin:promote -- adresse@exemple.fr   (ajoutez --retirer pour retirer le rôle)");
    process.exit(1);
  }
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) throw new Error("Aucun compte avec cette adresse. Créez d'abord le compte sur le site.");
    if (!user.emailVerified) throw new Error("L'adresse e-mail de ce compte n'est pas confirmée.");
    const role = flag === "--retirer" ? "CUSTOMER" : "ADMIN";
    await db.user.update({ where: { id: user.id }, data: { role } });
    await db.session.deleteMany({ where: { userId: user.id } }); // force une reconnexion
    await db.auditLog.create({ data: { action: role === "ADMIN" ? "user.promote_admin" : "user.demote_admin", entityType: "User", entityId: user.id, metadata: { via: "cli" } } });
    console.log(role === "ADMIN" ? `${user.email} est maintenant administratrice/administrateur. Reconnectez-vous.` : `Rôle administrateur retiré à ${user.email}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
