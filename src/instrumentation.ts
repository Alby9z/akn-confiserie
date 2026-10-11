/**
 * Vérifie la configuration au démarrage du serveur : en production, une variable
 * manquante (Stripe, e-mails…) arrête le serveur immédiatement avec un message clair,
 * au lieu de produire des erreurs sur chaque page.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    await import("./instrumentation-node");
  }
}
