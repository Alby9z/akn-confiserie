"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";
import { Button } from "@/components/ui/button";

export function AddToCartButton({ productId, stock, name, compact }: { productId: string; stock: number; name: string; compact?: boolean }) {
  const { add, lines } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const inCart = lines.find((l) => l.productId === productId)?.quantity ?? 0;
  const max = Math.max(0, Math.min(99, stock - inCart));

  if (stock <= 0) {
    return (
      <p className="text-sm font-semibold text-encre-doux" aria-live="polite">
        Rupture de stock
      </p>
    );
  }

  function onAdd(n: number) {
    add(productId, n);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  if (compact) {
    return (
      <Button size="sm" onClick={() => onAdd(1)} disabled={max === 0} aria-label={`Ajouter ${name} au panier`} className="w-full">
        {added ? <Check className="size-4" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
        {added ? "Ajouté" : max === 0 ? "Stock atteint" : "Ajouter"}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex h-12 items-center rounded-full border-2 border-guimauve-2 bg-white" role="group" aria-label="Quantité">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-guimauve disabled:opacity-40" disabled={qty <= 1} aria-label="Diminuer la quantité">
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(max || 1, q + 1))} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-guimauve disabled:opacity-40" disabled={qty >= max} aria-label="Augmenter la quantité">
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <Button size="lg" onClick={() => onAdd(qty)} disabled={max === 0 || qty > max} className="flex-1 sm:flex-none">
          {added ? <Check className="size-5" aria-hidden /> : <ShoppingBag className="size-5" aria-hidden />}
          {added ? "Ajouté au panier" : "Ajouter au panier"}
        </Button>
      </div>
      <p className="text-sm text-encre-doux" aria-live="polite">
        {max === 0 ? "Vous avez déjà tout le stock disponible dans votre panier." : stock <= 5 ? `Plus que ${stock} en stock.` : "En stock."}
        {inCart > 0 && (
          <>
            {" "}
            <Link href="/panier" className="font-semibold text-laque underline underline-offset-2">Voir le panier ({inCart})</Link>
          </>
        )}
      </p>
    </div>
  );
}
