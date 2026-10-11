"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Candy, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "./cart-provider";
import { readStoredCoupon, storeCoupon, useQuote } from "./use-quote";
import { formatPrice } from "@/lib/money";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Button, ButtonLink } from "@/components/ui/button";

export function CartView({ cancelled, checkoutOpen }: { cancelled: boolean; checkoutOpen: boolean }) {
  const { lines, ready, setQuantity, remove } = useCart();
  // Le contenu du panier n'est rendu qu'après hydratation (ready) : lecture directe sans écart serveur/client
  const [coupon, setCoupon] = useState(readStoredCoupon);
  const [couponInput, setCouponInput] = useState(readStoredCoupon);
  const { quote, loading, error } = useQuote(lines, ready, coupon, null);

  // Ajuste automatiquement le panier aux stocks réels
  useEffect(() => {
    if (!quote) return;
    for (const issue of quote.issues) {
      if (issue.type === "insufficient_stock") {
        if (issue.available > 0) setQuantity(issue.productId, issue.available);
        else remove(issue.productId);
      }
      if (issue.type === "unavailable") remove(issue.productId);
    }
  }, [quote, setQuantity, remove]);

  if (!ready) return <p className="text-encre-doux" role="status">Chargement du panier…</p>;

  if (lines.length === 0) {
    return (
      <EmptyState title="Votre panier est vide" action={<ButtonLink href="/boutique">Découvrir les bonbons</ButtonLink>}>
        Parcourez la boutique et ajoutez vos douceurs préférées.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div>
        {cancelled && <Alert tone="info" className="mb-6" title="Paiement annulé">Aucun montant n&apos;a été débité. Votre panier est conservé.</Alert>}
        {quote && quote.issues.length > 0 && (
          <Alert tone="warning" className="mb-6" title="Votre panier a été ajusté">
            <ul className="list-disc pl-4">
              {quote.issues.map((i) => (
                <li key={i.productId}>
                  {i.type === "insufficient_stock"
                    ? i.available > 0
                      ? `${i.name} : quantité ramenée à ${i.available} (stock disponible).`
                      : `${i.name} : désormais en rupture, retiré du panier.`
                    : `${("name" in i && i.name) || "Un produit"} n'est plus disponible et a été retiré.`}
                </li>
              ))}
            </ul>
          </Alert>
        )}
        {error && <Alert tone="error" className="mb-6">{error}</Alert>}
        <ul className="divide-y divide-guimauve-2 border-y border-guimauve-2">
          {(quote?.lines ?? []).map((l) => (
            <li key={l.productId} className="flex gap-4 py-5">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-guimauve">
                {l.image ? <Image src={l.image.src} alt={l.image.alt} fill sizes="96px" className="object-cover" /> : <Candy className="m-auto mt-8 size-8 text-laque/40" aria-hidden />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    {l.slug ? <Link href={`/produit/${l.slug}`} className="font-display text-lg text-reglisse hover:text-laque">{l.name}</Link> : <p className="font-display text-lg">{l.name}</p>}
                    {l.packaging && <p className="text-sm text-encre-doux">{l.packaging}</p>}
                    <p className="text-sm text-encre-doux tabular-nums">{formatPrice(l.unitPriceCents)} l&apos;unité</p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatPrice(l.lineTotalCents)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="inline-flex h-10 items-center rounded-full border-2 border-guimauve-2 bg-white" role="group" aria-label={`Quantité de ${l.name}`}>
                    <button type="button" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-guimauve disabled:opacity-40" onClick={() => setQuantity(l.productId, l.quantity - 1)} disabled={l.quantity <= 1} aria-label="Diminuer">
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <span className="w-8 text-center font-semibold tabular-nums">{l.quantity}</span>
                    <button type="button" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-guimauve disabled:opacity-40" onClick={() => setQuantity(l.productId, l.quantity + 1)} disabled={l.quantity >= Math.min(99, l.stock)} aria-label="Augmenter">
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(l.productId)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-encre-doux hover:bg-guimauve hover:text-alerte">
                    <Trash2 className="size-4" aria-hidden /> Retirer<span className="sr-only"> {l.name}</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
          {!quote && loading && <li className="py-6 text-encre-doux" role="status">Calcul du panier…</li>}
        </ul>
      </div>

      <aside className="h-fit space-y-5 rounded-3xl bg-white p-6 lg:sticky lg:top-24" aria-label="Récapitulatif">
        <h2 className="font-display text-2xl text-reglisse">Récapitulatif</h2>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const code = couponInput.trim().toUpperCase();
            setCoupon(code);
            storeCoupon(code);
          }}
        >
          <label htmlFor="coupon" className="text-sm font-semibold">Code promotionnel</label>
          <div className="flex gap-2">
            <input id="coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} maxLength={40} className="h-11 min-w-0 flex-1 rounded-xl border border-guimauve-2 px-3 uppercase focus:border-laque focus:outline-none" aria-describedby="coupon-msg" />
            <Button type="submit" variant="secondary" size="md">Appliquer</Button>
          </div>
          <p id="coupon-msg" aria-live="polite" className="text-sm">
            {coupon && quote?.couponError && <span className="text-alerte">{quote.couponError}</span>}
            {coupon && quote?.coupon && (
              <span className="text-menthe">
                Code {quote.coupon.code} appliqué.{" "}
                <button type="button" className="underline" onClick={() => { setCoupon(""); setCouponInput(""); storeCoupon(""); }}>Retirer</button>
              </span>
            )}
          </p>
        </form>
        <dl className="space-y-2 border-t border-guimauve-2 pt-4 text-[0.95rem]">
          <div className="flex justify-between"><dt>Sous-total</dt><dd className="tabular-nums">{quote ? formatPrice(quote.subtotalCents) : "—"}</dd></div>
          {quote && quote.discountCents > 0 && <div className="flex justify-between text-laque"><dt>Réduction</dt><dd className="tabular-nums">− {formatPrice(quote.discountCents)}</dd></div>}
          <div className="flex justify-between text-encre-doux"><dt>Retrait / livraison</dt><dd>calculé à l&apos;étape suivante</dd></div>
          <div className="flex justify-between border-t border-guimauve-2 pt-3 text-lg font-bold"><dt>Total TTC</dt><dd className="tabular-nums">{quote ? formatPrice(quote.subtotalCents - quote.discountCents) : "—"}</dd></div>
        </dl>
        {checkoutOpen ? (
          <ButtonLink href="/commande" size="lg" className="w-full" aria-disabled={!quote || loading}>Passer commande</ButtonLink>
        ) : (
          <Alert tone="info" title="Commande en ligne bientôt disponible">Le paiement en ligne n&apos;est pas encore ouvert. Contactez la boutique pour réserver ces articles.</Alert>
        )}
      </aside>
    </div>
  );
}
