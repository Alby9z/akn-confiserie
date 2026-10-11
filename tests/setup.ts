import { vi } from "vitest";

/**
 * Contexte de requête Next.js simulé : chaque test peut définir les en-têtes
 * (cookie de session, IP) via setRequestHeaders().
 */
const state = { headers: new Headers({ "x-forwarded-for": "203.0.113.10" }) };

export function setRequestHeaders(h: Record<string, string>) {
  state.headers = new Headers({ "x-forwarded-for": "203.0.113.10", ...h });
}

vi.mock("next/headers", () => ({
  headers: async () => state.headers,
  cookies: async () => {
    const raw = state.headers.get("cookie") ?? "";
    const map = new Map(raw.split(/;\s*/).filter(Boolean).map((c) => { const i = c.indexOf("="); return [c.slice(0, i), c.slice(i + 1)] as [string, string]; }));
    return { get: (n: string) => (map.has(n) ? { name: n, value: map.get(n)! } : undefined), getAll: () => [...map].map(([name, value]) => ({ name, value })), set: () => {}, delete: () => {}, has: (n: string) => map.has(n) };
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

(globalThis as unknown as { __setRequestHeaders: typeof setRequestHeaders }).__setRequestHeaders = setRequestHeaders;
