"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { CheckCircle2, Paperclip } from "lucide-react";
import { submitCustomRequest, type RequestState } from "@/app/(shop)/evenements/actions";
import { EVENT_TYPES, type EventTypeKey } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";

const MAX_MB = 5;

export function CustomRequestForm({ defaultType, types, prefill }: { defaultType: EventTypeKey; types: EventTypeKey[]; prefill?: { fullName?: string; email?: string; phone?: string } }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(submitCustomRequest, { status: "idle" });
  const [fileError, setFileError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const err = (k: string) => (state.status === "error" ? state.fields?.[k]?.[0] : undefined);
  const today = new Date().toISOString().slice(0, 10);

  if (state.status === "success") {
    return (
      <div className="rounded-[2rem] bg-white p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto size-12 text-menthe" aria-hidden />
        <h2 className="mt-3 font-display text-3xl text-reglisse">Demande envoyée</h2>
        <p className="mt-3 text-lg">Votre référence : <strong>{state.reference}</strong></p>
        <p className="mx-auto mt-2 max-w-md text-encre-doux">
          Un e-mail de confirmation vient de vous être envoyé. {state.responsePromise ?? "Nous revenons vers vous dès que possible."} Rien n&apos;est facturé avant que vous ayez accepté notre proposition.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      className="space-y-6 rounded-[2rem] bg-white p-6 sm:p-8"
      onSubmit={(e) => {
        const f = (e.currentTarget.elements.namedItem("attachment") as HTMLInputElement)?.files?.[0];
        if (f && f.size > MAX_MB * 1024 * 1024) {
          e.preventDefault();
          setFileError(`Le fichier dépasse ${MAX_MB} Mo.`);
        }
      }}
    >
      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}
      {/* Champ piège anti-robots, invisible pour les humains */}
      <div aria-hidden className="absolute left-[-9999px] size-px overflow-hidden">
        <label>Site web<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom et prénom" required error={err("fullName")}>{(p) => <Input {...p} name="fullName" autoComplete="name" defaultValue={prefill?.fullName} maxLength={120} />}</Field>
        <Field label="Type de demande" required error={err("eventType")}>
          {(p) => (
            <Select {...p} name="eventType" defaultValue={defaultType}>
              {types.map((t) => <option key={t} value={t}>{EVENT_TYPES[t]}</option>)}
            </Select>
          )}
        </Field>
        <Field label="E-mail" required error={err("email")}>{(p) => <Input {...p} name="email" type="email" autoComplete="email" defaultValue={prefill?.email} />}</Field>
        <Field label="Téléphone" required error={err("phone")}>{(p) => <Input {...p} name="phone" type="tel" autoComplete="tel" defaultValue={prefill?.phone} />}</Field>
        <Field label="Date prévue" error={err("eventDate")}>{(p) => <Input {...p} name="eventDate" type="date" min={today} />}</Field>
        <Field label="Nombre approximatif de personnes" error={err("guestCount")}>{(p) => <Input {...p} name="guestCount" inputMode="numeric" maxLength={6} />}</Field>
        <Field label="Quantité souhaitée" hint="Ex. : 50 sachets de 100 g, 3 kg en vrac…" error={err("quantity")}>{(p) => <Input {...p} name="quantity" maxLength={200} />}</Field>
        <Field label="Budget indicatif" hint="Ex. : environ 150 €" error={err("budget")}>{(p) => <Input {...p} name="budget" maxLength={100} />}</Field>
      </div>
      <Field label="Produits ou couleurs souhaités" error={err("preferences")}>{(p) => <Input {...p} name="preferences" maxLength={1000} placeholder="Ex. : tons rose et doré, sans gélatine de porc…" />}</Field>
      <Field label="Décrivez votre besoin" required error={err("description")}>{(p) => <Textarea {...p} name="description" rows={6} maxLength={4000} />}</Field>
      <Field label="Fichier de référence" hint={`Facultatif — photo ou PDF (JPG, PNG, WebP, PDF), ${MAX_MB} Mo maximum.`} error={fileError ?? err("attachment")}>
        {(p) => (
          <div className="flex items-center gap-3">
            <Paperclip className="size-5 text-encre-doux" aria-hidden />
            <input {...p} name="attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={() => setFileError(null)} className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-guimauve file:px-4 file:py-2 file:font-semibold file:text-encre hover:file:bg-guimauve-2" />
          </div>
        )}
      </Field>
      <Checkbox
        name="consent"
        error={err("consent")}
        label={<>J&apos;accepte que mes informations soient utilisées pour traiter cette demande et me recontacter. <Link href="/confidentialite" className="font-semibold text-laque underline" target="_blank">En savoir plus</Link></>}
      />
      <Button type="submit" size="lg" loading={pending}>Envoyer ma demande</Button>
      <p className="text-sm text-encre-doux">Votre demande n&apos;engage à rien : nous l&apos;étudions et vous envoyons une proposition avec le prix définitif avant toute confirmation.</p>
    </form>
  );
}
