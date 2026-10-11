/**
 * Données initiales — uniquement des informations CONFIRMÉES par la cliente.
 * Aucun produit, prix, stock, horaire ou avis n'est créé ici.
 * Ré-exécutable sans risque : ne remplace jamais un contenu déjà modifié.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (existsSync(".env")) process.loadEnvFile(".env");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Catégories proposées dans le cahier des charges : créées MASQUÉES, à valider par la cliente.
const PROPOSED_CATEGORIES = [
  "Bonbons acidulés",
  "Bonbons gélifiés",
  "Bonbons en vrac",
  "Réglisses",
  "Chocolats et confiseries",
  "Sucettes",
  "Coffrets cadeaux",
  "Sachets personnalisés",
];

function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  await db.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      shopName: "AKN Confiserie 90",
      contactName: "Justine Dolle",
      phone: "07 66 39 47 84",
      addressLine: "23 boulevard Joffre",
      postalCode: "90000",
      city: "Belfort",
      // Horaires, e-mail, modes de retrait/livraison : à renseigner dans l'administration
    },
  });

  for (const [i, name] of PROPOSED_CATEGORIES.entries()) {
    const slug = slugify(name);
    await db.category.upsert({ where: { slug }, update: {}, create: { name, slug, position: i, isActive: false } });
  }

  const legal = [
    { slug: "MENTIONS_LEGALES" as const, title: "Mentions légales", file: "mentions-legales.md" },
    { slug: "CGV" as const, title: "Conditions générales de vente", file: "cgv.md" },
    { slug: "CONFIDENTIALITE" as const, title: "Politique de confidentialité", file: "confidentialite.md" },
    { slug: "COOKIES" as const, title: "Politique de cookies", file: "cookies.md" },
  ];
  for (const l of legal) {
    const content = readFileSync(join(__dirname, "legal", l.file), "utf8");
    await db.legalPage.upsert({ where: { slug: l.slug }, update: {}, create: { slug: l.slug, title: l.title, content, isValidated: false } });
  }

  console.log("Données initiales en place (paramètres, catégories proposées masquées, trames légales).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
