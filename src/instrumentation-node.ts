import { loadEnv } from "./lib/env-schema";

try {
  loadEnv();
} catch (e) {
  console.error(`\n${e instanceof Error ? e.message : e}\n\nLe serveur ne peut pas démarrer : complétez le fichier .env (voir .env.example).\n`);
  process.exit(1);
}
