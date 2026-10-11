"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type CartLine = { productId: string; quantity: number };

type CartContextValue = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  lastAdded: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "akn-cart-v1";
const MAX = 99;

function readLocal(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l) => l && typeof l.productId === "string" && Number.isInteger(l.quantity) && l.quantity > 0)
      .map((l) => ({ productId: l.productId, quantity: Math.min(MAX, l.quantity) }));
  } catch {
    return [];
  }
}

function writeLocal(lines: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* stockage indisponible (navigation privée) : le panier reste en mémoire */
  }
}

/**
 * Panier conservé dans le navigateur (identifiants + quantités uniquement, jamais de prix).
 * Pour une cliente connectée, il est fusionné puis synchronisé avec son compte.
 */
export function CartProvider({ children, userId }: { children: React.ReactNode; userId: string | null }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [lastAdded, setLastAdded] = useState(0);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUser = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const local = readLocal();
      // Déconnexion : on vide le panier local pour ne pas le laisser sur un appareil partagé
      if (prevUser.current && !userId) {
        writeLocal([]);
        if (!cancelled) setLines([]);
      } else if (userId) {
        try {
          const res = await fetch("/api/cart", { cache: "no-store" });
          if (res.ok) {
            const server: { lines: CartLine[] } = await res.json();
            const merged = new Map<string, number>();
            for (const l of [...server.lines, ...local]) merged.set(l.productId, Math.min(MAX, Math.max(merged.get(l.productId) ?? 0, l.quantity)));
            const next = [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
            if (!cancelled) setLines(next);
            writeLocal(next);
            await fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines: next }) });
          } else if (!cancelled) setLines(local);
        } catch {
          if (!cancelled) setLines(local);
        }
      } else if (!cancelled) setLines(local);
      prevUser.current = userId;
      if (!cancelled) setReady(true);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback(
    (next: CartLine[]) => {
      writeLocal(next);
      if (!userId) return;
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines: next }) }).catch(() => {});
      }, 600);
    },
    [userId],
  );

  const update = useCallback(
    (fn: (prev: CartLine[]) => CartLine[]) => {
      setLines((prev) => {
        const next = fn(prev).filter((l) => l.quantity > 0);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      lastAdded,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      add: (productId, quantity = 1) => {
        update((prev) => {
          const existing = prev.find((l) => l.productId === productId);
          if (existing) return prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(MAX, l.quantity + quantity) } : l));
          return [...prev, { productId, quantity: Math.min(MAX, quantity) }];
        });
        setLastAdded(Date.now());
      },
      setQuantity: (productId, quantity) =>
        update((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.max(0, Math.min(MAX, Math.floor(quantity))) } : l))),
      remove: (productId) => update((prev) => prev.filter((l) => l.productId !== productId)),
      clear: () => update(() => []),
    }),
    [lines, ready, lastAdded, update],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans CartProvider");
  return ctx;
}
