import "server-only";
import { loadEnv } from "./env-schema";

export const env = loadEnv();
export const appUrl = env.APP_URL.replace(/\/$/, "");
