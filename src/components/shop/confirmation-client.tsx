"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./cart-provider";
import { storeCoupon } from "./use-quote";

/** Vide le panier après paiement et rafraîchit tant que Stripe n'a pas confirmé. */
export function ConfirmationEffects({ clearCart, poll }: { clearCart: boolean; poll: boolean }) {
  const { clear, ready } = useCart();
  const router = useRouter();
  useEffect(() => {
    if (clearCart && ready) {
      clear();
      storeCoupon("");
    }
  }, [clearCart, ready, clear]);
  useEffect(() => {
    if (!poll) return;
    let n = 0;
    const id = setInterval(() => {
      n++;
      if (n > 20) clearInterval(id);
      router.refresh();
    }, 3000);
    return () => clearInterval(id);
  }, [poll, router]);
  return null;
}
