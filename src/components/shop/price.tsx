import { formatPrice, pricePerKgCents } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({ priceCents, compareAtPriceCents, netWeightGrams, size = "md", className }: { priceCents: number; compareAtPriceCents?: number | null; netWeightGrams?: number | null; size?: "md" | "lg"; className?: string }) {
  const promo = compareAtPriceCents != null && compareAtPriceCents > priceCents;
  const perKg = pricePerKgCents(priceCents, netWeightGrams);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn("font-bold tabular-nums", promo ? "text-laque" : "text-reglisse", size === "lg" ? "text-3xl" : "text-lg")}>
        {formatPrice(priceCents)}
        <span className="sr-only"> TTC</span>
      </span>
      {promo && (
        <span className="text-sm text-encre-doux line-through tabular-nums">
          <span className="sr-only">au lieu de </span>
          {formatPrice(compareAtPriceCents)}
        </span>
      )}
      {perKg != null && <span className="w-full text-xs text-encre-doux tabular-nums">{formatPrice(perKg)} / kg</span>}
    </div>
  );
}
