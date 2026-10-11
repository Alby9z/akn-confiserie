"use client";

import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/app/(shop)/compte/actions";
import { cn } from "@/lib/utils";

export function FavoriteButton({ productId, initial }: { productId: string; initial: boolean }) {
  const [pending, start] = useTransition();
  const [fav, setFav] = useOptimistic(initial);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          setFav(!fav);
          await toggleFavorite(productId);
        })
      }
      aria-pressed={fav}
      className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-guimauve-2 px-4 text-sm font-semibold hover:border-laque"
    >
      <Heart className={cn("size-4.5", fav && "fill-laque text-laque")} aria-hidden />
      {fav ? "Dans mes favoris" : "Ajouter aux favoris"}
    </button>
  );
}
