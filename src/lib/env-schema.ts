/** Validation des variables d'environnement (sans dépendance serveur, utilisable au démarrage). */
import { z } from "zod";

/**
 * Variables d'environnement côté serveur, validées au démarrage.
 * En production, les intégrations (Stripe, e-mail) sont obligatoires :
 * on refuse de démarrer plutôt que de simuler un fonctionnement.
 */
// Pendant « next build », les secrets de production peuvent être absents (CI) : ils sont exigés au démarrage.
const isBuild = process.env.NEXT_PHASE === "phase-production-build";
const isProd = process.env.NODE_ENV === "production" && !isBuild;

const schema = z.object({
  DATABASE_URL: isBuild ? z.string().default("postgresql://build:build@localhost:5432/build") : z.string().url(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: isBuild ? z.string().default("build-time-placeholder-secret-not-used-at-runtime") : z.string().min(32, "BETTER_AUTH_SECRET doit faire au moins 32 caractères"),
  STRIPE_SECRET_KEY: isProd ? z.string().startsWith("sk_") : z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: isProd ? z.string().startsWith("whsec_") : z.string().startsWith("whsec_").optional(),
  RESEND_API_KEY: isProd ? z.string().min(1) : z.string().optional(),
  EMAIL_FROM: isProd ? z.string().min(3) : z.string().default("AKN Confiserie 90 <onboarding@resend.dev>"),
  /** Adresse qui reçoit les notifications de commandes et de demandes */
  ADMIN_NOTIFICATION_EMAIL: isProd ? z.string().email() : z.string().email().optional(),
  STORAGE_DIR: z.string().default("./storage"),
  GOOGLE_SITE_VERIFICATION: z.string().optional(),
});

export function loadEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuration invalide (.env) :\n${issues}`);
  }
  return parsed.data;
}

