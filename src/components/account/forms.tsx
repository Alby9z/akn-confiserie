"use client";

import { useTransition } from "react";
import { ActionForm } from "./action-form";
import { changePassword, deleteAddress, requestAccountDeletion, revokeOtherSessions, revokeSession, saveAddress, updatePreferences, updateProfile } from "@/app/(shop)/compte/actions";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function ProfileForm({ user }: { user: { firstName: string | null; lastName: string | null; phone: string | null; email: string } }) {
  return (
    <ActionForm action={updateProfile} submitLabel="Enregistrer">
      {(err) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" required error={err("firstName")}>{(p) => <Input {...p} name="firstName" defaultValue={user.firstName ?? ""} autoComplete="given-name" />}</Field>
            <Field label="Nom" required error={err("lastName")}>{(p) => <Input {...p} name="lastName" defaultValue={user.lastName ?? ""} autoComplete="family-name" />}</Field>
          </div>
          <Field label="Téléphone" error={err("phone")}>{(p) => <Input {...p} name="phone" type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" />}</Field>
          <Field label="Adresse e-mail" hint="Pour changer d'adresse e-mail, contactez la boutique.">{(p) => <Input {...p} value={user.email} readOnly disabled />}</Field>
        </>
      )}
    </ActionForm>
  );
}

type Addr = { id: string; label: string | null; fullName: string; line1: string; line2: string | null; postalCode: string; city: string; phone: string | null; isDefault: boolean };

export function AddressForm({ address, onDone }: { address?: Addr; onDone?: () => void }) {
  return (
    <ActionForm action={async (prev, fd) => { const r = await saveAddress(prev, fd); if (r.ok) onDone?.(); return r; }} submitLabel={address ? "Enregistrer l'adresse" : "Ajouter l'adresse"} className="space-y-4">
      {(err) => (
        <>
          {address && <input type="hidden" name="id" value={address.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de l'adresse" hint="Ex. : Maison, Bureau" error={err("label")}>{(p) => <Input {...p} name="label" defaultValue={address?.label ?? ""} maxLength={40} />}</Field>
            <Field label="Nom du destinataire" required error={err("fullName")}>{(p) => <Input {...p} name="fullName" defaultValue={address?.fullName ?? ""} autoComplete="name" />}</Field>
          </div>
          <Field label="Adresse" required error={err("line1")}>{(p) => <Input {...p} name="line1" defaultValue={address?.line1 ?? ""} autoComplete="address-line1" />}</Field>
          <Field label="Complément" error={err("line2")}>{(p) => <Input {...p} name="line2" defaultValue={address?.line2 ?? ""} autoComplete="address-line2" />}</Field>
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <Field label="Code postal" required error={err("postalCode")}>{(p) => <Input {...p} name="postalCode" inputMode="numeric" defaultValue={address?.postalCode ?? ""} autoComplete="postal-code" />}</Field>
            <Field label="Ville" required error={err("city")}>{(p) => <Input {...p} name="city" defaultValue={address?.city ?? ""} autoComplete="address-level2" />}</Field>
          </div>
          <Field label="Téléphone" error={err("phone")}>{(p) => <Input {...p} name="phone" type="tel" defaultValue={address?.phone ?? ""} />}</Field>
          <Checkbox name="isDefault" defaultChecked={address?.isDefault} label="Adresse par défaut" />
        </>
      )}
    </ActionForm>
  );
}

export function DeleteAddressButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="sm" loading={pending} onClick={() => { if (confirm("Supprimer cette adresse ?")) start(() => deleteAddress(id)); }}>
      Supprimer
    </Button>
  );
}

export function PreferencesForm({ marketingOptIn }: { marketingOptIn: boolean }) {
  return (
    <ActionForm action={updatePreferences} submitLabel="Enregistrer mes préférences">
      {() => (
        <Checkbox name="marketingOptIn" defaultChecked={marketingOptIn} label="Je souhaite recevoir par e-mail les nouveautés et promotions de la boutique." />
      )}
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changePassword} submitLabel="Modifier le mot de passe">
      {(err) => (
        <>
          <Field label="Mot de passe actuel" required error={err("currentPassword")}>{(p) => <Input {...p} name="currentPassword" type="password" autoComplete="current-password" />}</Field>
          <Field label="Nouveau mot de passe" required hint="10 caractères minimum, avec au moins une lettre et un chiffre." error={err("newPassword")}>{(p) => <Input {...p} name="newPassword" type="password" autoComplete="new-password" />}</Field>
          <Field label="Confirmer le nouveau mot de passe" required error={err("confirmPassword")}>{(p) => <Input {...p} name="confirmPassword" type="password" autoComplete="new-password" />}</Field>
        </>
      )}
    </ActionForm>
  );
}

export function RevokeSessionButton({ token, label = "Déconnecter" }: { token?: string; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" size="sm" loading={pending} onClick={() => start(() => (token ? revokeSession(token) : revokeOtherSessions()))}>
      {label}
    </Button>
  );
}

export function DeletionForm() {
  return (
    <ActionForm action={requestAccountDeletion} submitLabel="Demander la suppression" variant="danger">
      {(err) => (
        <Field label="Pour confirmer, tapez SUPPRIMER" required error={err("confirm")}>{(p) => <Input {...p} name="confirm" autoComplete="off" />}</Field>
      )}
    </ActionForm>
  );
}
