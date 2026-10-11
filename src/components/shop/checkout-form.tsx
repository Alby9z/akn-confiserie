"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Store, Truck } from "lucide-react";
import { useCart } from "./cart-provider";
import { readStoredCoupon, useQuote } from "./use-quote";
import { checkoutSchema } from "@/lib/validation/schemas";
import { formatPrice } from "@/lib/money";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

type FormInput = z.input<typeof checkoutSchema>;
type FormOutput = z.output<typeof checkoutSchema>;

export type CheckoutPrefill = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: { fullName: string; line1: string; line2?: string | null; postalCode: string; city: string } | null;
};

export function CheckoutForm({ prefill, pickupInfo, deliveryInfo, isLoggedIn }: { prefill: CheckoutPrefill; pickupInfo?: string | null; deliveryInfo?: string | null; isLoggedIn: boolean }) {
  const { lines, ready } = useCart();
  const [coupon] = useState(readStoredCoupon);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      lines: [],
      couponCode: "",
      fulfillment: "PICKUP",
      email: prefill.email ?? "",
      firstName: prefill.firstName ?? "",
      lastName: prefill.lastName ?? "",
      phone: prefill.phone ?? "",
      address: undefined,
      note: "",
      acceptTerms: false as unknown as true,
    },
  });
  const { register, handleSubmit, setValue, formState, control } = form;
  const fulfillment = useWatch({ control, name: "fulfillment" });
  const { quote, loading } = useQuote(lines, ready, coupon, fulfillment);

  useEffect(() => {
    if (quote?.fulfillmentOptions.length && !quote.fulfillmentOptions.includes(fulfillment)) setValue("fulfillment", quote.fulfillmentOptions[0]);
  }, [quote, fulfillment, setValue]);

  useEffect(() => {
    if (fulfillment === "DELIVERY") {
      setValue("address", {
        fullName: prefill.address?.fullName ?? "",
        line1: prefill.address?.line1 ?? "",
        line2: prefill.address?.line2 ?? "",
        postalCode: prefill.address?.postalCode ?? "",
        city: prefill.address?.city ?? "",
      });
    } else setValue("address", undefined);
  }, [fulfillment, setValue, prefill.address]);

  if (!ready) return <p role="status">Chargement…</p>;
  if (lines.length === 0) {
    return <EmptyState title="Votre panier est vide" action={<ButtonLink href="/boutique">Retour à la boutique</ButtonLink>} />;
  }

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, lines, couponCode: coupon || "" }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.url) {
      window.location.assign(body.url);
      return;
    }
    setServerError(body.error ?? "Une erreur est survenue. Réessayez.");
  });

  const e = formState.errors;
  const hasIssues = (quote?.issues.length ?? 0) > 0;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-10">
        {!isLoggedIn && (
          <p className="rounded-2xl bg-guimauve/60 p-4 text-sm">
            Vous avez un compte ? <Link href="/connexion?retour=/commande" className="font-semibold text-laque underline">Connectez-vous</Link> pour retrouver vos commandes. Sinon, continuez simplement sans compte.
          </p>
        )}
        <fieldset className="space-y-4">
          <legend className="font-display text-2xl text-reglisse">Vos coordonnées</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" required error={e.firstName?.message}>{(p) => <Input {...p} autoComplete="given-name" {...register("firstName")} />}</Field>
            <Field label="Nom" required error={e.lastName?.message}>{(p) => <Input {...p} autoComplete="family-name" {...register("lastName")} />}</Field>
          </div>
          <Field label="Adresse e-mail" required hint="Pour vous envoyer la confirmation de commande." error={e.email?.message}>
            {(p) => <Input {...p} type="email" autoComplete="email" {...register("email")} />}
          </Field>
          <Field label="Téléphone" required hint="Pour vous joindre en cas de question sur votre commande." error={e.phone?.message}>
            {(p) => <Input {...p} type="tel" autoComplete="tel" {...register("phone")} />}
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-display text-2xl text-reglisse">Retrait ou livraison</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {quote?.fulfillmentOptions.includes("PICKUP") && (
              <label className={cn("flex cursor-pointer gap-3 rounded-2xl border-2 bg-white p-4", fulfillment === "PICKUP" ? "border-laque" : "border-guimauve-2")}>
                <input type="radio" value="PICKUP" {...register("fulfillment")} className="mt-1 accent-laque" />
                <span>
                  <span className="flex items-center gap-2 font-semibold"><Store className="size-4" aria-hidden /> Retrait en boutique</span>
                  <span className="text-sm text-encre-doux">Gratuit — 23 bd Joffre, Belfort</span>
                </span>
              </label>
            )}
            {quote?.fulfillmentOptions.includes("DELIVERY") && (
              <label className={cn("flex cursor-pointer gap-3 rounded-2xl border-2 bg-white p-4", fulfillment === "DELIVERY" ? "border-laque" : "border-guimauve-2")}>
                <input type="radio" value="DELIVERY" {...register("fulfillment")} className="mt-1 accent-laque" />
                <span>
                  <span className="flex items-center gap-2 font-semibold"><Truck className="size-4" aria-hidden /> Livraison</span>
                  <span className="text-sm text-encre-doux">
                    {quote.deliveryFeeCents != null && formatPrice(quote.deliveryFeeCents)}
                    {quote.freeDeliveryThresholdCents != null && ` — offerte dès ${formatPrice(quote.freeDeliveryThresholdCents)}`}
                  </span>
                </span>
              </label>
            )}
          </div>
          {fulfillment === "PICKUP" && pickupInfo && <p className="text-sm text-encre-doux">{pickupInfo}</p>}
          {fulfillment === "DELIVERY" && (
            <div className="space-y-4">
              {deliveryInfo && <p className="text-sm text-encre-doux">{deliveryInfo}</p>}
              <Field label="Nom du destinataire" required error={e.address?.fullName?.message}>{(p) => <Input {...p} autoComplete="name" {...register("address.fullName")} />}</Field>
              <Field label="Adresse" required error={e.address?.line1?.message}>{(p) => <Input {...p} autoComplete="address-line1" {...register("address.line1")} />}</Field>
              <Field label="Complément d'adresse" error={e.address?.line2?.message}>{(p) => <Input {...p} autoComplete="address-line2" {...register("address.line2")} />}</Field>
              <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                <Field label="Code postal" required error={e.address?.postalCode?.message}>{(p) => <Input {...p} inputMode="numeric" autoComplete="postal-code" {...register("address.postalCode")} />}</Field>
                <Field label="Ville" required error={e.address?.city?.message}>{(p) => <Input {...p} autoComplete="address-level2" {...register("address.city")} />}</Field>
              </div>
            </div>
          )}
          <Field label="Message pour la boutique" hint="Facultatif." error={e.note?.message}>{(p) => <Textarea {...p} maxLength={500} {...register("note")} />}</Field>
        </fieldset>
      </div>

      <aside className="h-fit space-y-5 rounded-3xl bg-white p-6 lg:sticky lg:top-24" aria-label="Récapitulatif de la commande">
        <h2 className="font-display text-2xl text-reglisse">Votre commande</h2>
        <ul className="space-y-2 text-sm">
          {quote?.lines.map((l) => (
            <li key={l.productId} className="flex justify-between gap-3">
              <span>{l.name} × {l.quantity}</span>
              <span className="tabular-nums">{formatPrice(l.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        {quote && (
          <dl className="space-y-2 border-t border-guimauve-2 pt-4 text-[0.95rem]">
            <div className="flex justify-between"><dt>Sous-total</dt><dd className="tabular-nums">{formatPrice(quote.subtotalCents)}</dd></div>
            {quote.discountCents > 0 && <div className="flex justify-between text-laque"><dt>Réduction ({quote.coupon?.code})</dt><dd className="tabular-nums">− {formatPrice(quote.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt>{fulfillment === "DELIVERY" ? "Livraison" : "Retrait en boutique"}</dt><dd className="tabular-nums">{quote.shippingCents === 0 ? "Gratuit" : formatPrice(quote.shippingCents)}</dd></div>
            <div className="flex justify-between border-t border-guimauve-2 pt-3 text-lg font-bold"><dt>Total TTC</dt><dd className="tabular-nums">{formatPrice(quote.totalCents)}</dd></div>
          </dl>
        )}
        {hasIssues && <Alert tone="warning">Votre panier a changé (stock). <Link href="/panier" className="font-semibold underline">Revoir le panier</Link></Alert>}
        <Checkbox
          {...register("acceptTerms")}
          error={e.acceptTerms?.message}
          label={<>J&apos;accepte les <Link href="/cgv" target="_blank" className="font-semibold text-laque underline">conditions générales de vente</Link> et j&apos;ai pris connaissance de la <Link href="/confidentialite" target="_blank" className="font-semibold text-laque underline">politique de confidentialité</Link>.</>}
        />
        {serverError && <Alert tone="error">{serverError}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting} disabled={loading || !quote || hasIssues}>
          <Lock className="size-4" aria-hidden /> Payer {quote ? formatPrice(quote.totalCents) : ""}
        </Button>
        <p className="text-xs leading-relaxed text-encre-doux">Vous allez être redirigé vers Stripe pour le paiement sécurisé par carte. Vos coordonnées bancaires ne transitent pas par notre site.</p>
      </aside>
    </form>
  );
}
