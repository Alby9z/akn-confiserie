"use client";

import { useEffect, useState } from "react";
import type { CartLine } from "./cart-provider";

export type QuoteLine = {
  productId: string;
  name: string;
  packaging: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  slug?: string;
  stock: number;
  image: { src: string; alt: string } | null;
};

export type Quote = {
  lines: QuoteLine[];
  issues: ({ type: "unavailable"; productId: string; name?: string } | { type: "insufficient_stock"; productId: string; name: string; available: number } | { type: "invalid_quantity"; productId: string })[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  fulfillment: "PICKUP" | "DELIVERY" | null;
  fulfillmentOptions: ("PICKUP" | "DELIVERY")[];
  coupon: { id: string; code: string } | null;
  couponError: string | null;
  deliveryFeeCents: number | null;
  freeDeliveryThresholdCents: number | null;
};

/** Demande au serveur le calcul exact du panier (prix, stock, promo, livraison). */
export function useQuote(lines: CartLine[], ready: boolean, couponCode: string, fulfillment: "PICKUP" | "DELIVERY" | null) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify([lines, couponCode, fulfillment]);

  useEffect(() => {
    if (!ready || lines.length === 0) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines, couponCode: couponCode || undefined, fulfillment }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error();
        setQuote(await res.json());
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Impossible de calculer le panier. Vérifiez votre connexion et réessayez.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  // Panier vide : rien à calculer
  if (ready && lines.length === 0) return { quote: null, loading: false, error: null };
  return { quote, loading, error };
}

const COUPON_KEY = "akn-coupon";
export function readStoredCoupon(): string {
  try {
    return localStorage.getItem(COUPON_KEY) ?? "";
  } catch {
    return "";
  }
}
export function storeCoupon(code: string) {
  try {
    if (code) localStorage.setItem(COUPON_KEY, code);
    else localStorage.removeItem(COUPON_KEY);
  } catch {}
}
