import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // Base de test partagée : exécution séquentielle
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://akn:akn_dev_password@localhost:5432/akn_confiserie_test",
      APP_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0123456789",
      STRIPE_SECRET_KEY: "sk_test_dummy_key_for_signature_tests",
      STRIPE_WEBHOOK_SECRET: "whsec_test_secret_for_vitest",
      STORAGE_DIR: "./.test-storage",
      ADMIN_NOTIFICATION_EMAIL: "boutique@example.test",
    },
  },
});
