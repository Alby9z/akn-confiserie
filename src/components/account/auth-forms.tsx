"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { emailSchema, resetPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";

/** N'accepte que les chemins internes pour éviter les redirections ouvertes. */
function safeReturn(v: string | null, fallback = "/compte") {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

function Card({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] bg-white p-7 sm:p-9">
      <h1 className="font-display text-3xl font-semibold text-reglisse">{title}</h1>
      <div className="mt-6">{children}</div>
      {footer && <div className="mt-6 border-t border-guimauve-2 pt-5 text-sm text-encre-doux">{footer}</div>}
    </div>
  );
}

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = safeReturn(params.get("retour"));
  const [error, setError] = useState<React.ReactNode>(null);
  const [unverified, setUnverified] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit(async (d) => {
    setError(null);
    setUnverified(null);
    const { error } = await authClient.signIn.email({ email: d.email, password: d.password });
    if (!error) {
      router.replace(returnTo);
      router.refresh();
      return;
    }
    if (error.status === 403) {
      setUnverified(d.email);
      setError("Votre adresse e-mail n'est pas encore confirmée. Cliquez sur le lien reçu par e-mail.");
    } else if (error.status === 429) setError("Trop de tentatives. Patientez quelques minutes avant de réessayer.");
    else setError("Adresse e-mail ou mot de passe incorrect.");
  });

  return (
    <Card title="Connexion" footer={<>Pas encore de compte ? <Link href={`/inscription${returnTo !== "/compte" ? `?retour=${encodeURIComponent(returnTo)}` : ""}`} className="font-semibold text-laque underline">Créer un compte</Link></>}>
      {params.get("verifie") === "1" && <Alert tone="success" className="mb-5">Adresse e-mail confirmée. Vous pouvez vous connecter.</Alert>}
      {params.get("reinitialise") === "1" && <Alert tone="success" className="mb-5">Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.</Alert>}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {unverified && (
          <Button type="button" variant="secondary" size="sm" disabled={resent} onClick={async () => { await authClient.sendVerificationEmail({ email: unverified, callbackURL: "/compte" }); setResent(true); }}>
            {resent ? "E-mail renvoyé" : "Renvoyer l'e-mail de confirmation"}
          </Button>
        )}
        <Field label="Adresse e-mail" required error={formState.errors.email?.message}>{(p) => <Input {...p} type="email" autoComplete="email" {...register("email")} />}</Field>
        <Field label="Mot de passe" required error={formState.errors.password?.message}>{(p) => <Input {...p} type="password" autoComplete="current-password" {...register("password")} />}</Field>
        <div className="flex justify-end text-sm"><Link href="/mot-de-passe-oublie" className="font-medium text-laque underline">Mot de passe oublié ?</Link></div>
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>Se connecter</Button>
      </form>
    </Card>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.input<typeof signUpSchema>, unknown, z.output<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { marketingOptIn: false, acceptTerms: false as unknown as true },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (d) => {
    setError(null);
    const { error } = await authClient.signUp.email({
      email: d.email,
      password: d.password,
      name: `${d.firstName} ${d.lastName}`,
      firstName: d.firstName,
      lastName: d.lastName,
      marketingOptIn: d.marketingOptIn,
      callbackURL: "/compte",
    } as Parameters<typeof authClient.signUp.email>[0]);
    // Par sécurité, on ne révèle pas si l'adresse est déjà utilisée
    if (error && error.status !== 422 && error.status !== 400) {
      setError(error.status === 429 ? "Trop de tentatives. Réessayez plus tard." : "La création du compte a échoué. Réessayez dans quelques instants.");
      return;
    }
    router.push(`/verification-email?email=${encodeURIComponent(d.email)}`);
  });
  return (
    <Card title="Créer un compte" footer={<>Déjà inscrite ou inscrit ? <Link href="/connexion" className="font-semibold text-laque underline">Se connecter</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" required error={e.firstName?.message}>{(p) => <Input {...p} autoComplete="given-name" {...register("firstName")} />}</Field>
          <Field label="Nom" required error={e.lastName?.message}>{(p) => <Input {...p} autoComplete="family-name" {...register("lastName")} />}</Field>
        </div>
        <Field label="Adresse e-mail" required error={e.email?.message}>{(p) => <Input {...p} type="email" autoComplete="email" {...register("email")} />}</Field>
        <Field label="Mot de passe" required hint="10 caractères minimum, avec au moins une lettre et un chiffre." error={e.password?.message}>{(p) => <Input {...p} type="password" autoComplete="new-password" {...register("password")} />}</Field>
        <Field label="Confirmer le mot de passe" required error={e.confirmPassword?.message}>{(p) => <Input {...p} type="password" autoComplete="new-password" {...register("confirmPassword")} />}</Field>
        <Checkbox {...register("acceptTerms")} error={e.acceptTerms?.message} label={<>J&apos;accepte les <Link href="/cgv" target="_blank" className="font-semibold text-laque underline">conditions générales de vente</Link> et la <Link href="/confidentialite" target="_blank" className="font-semibold text-laque underline">politique de confidentialité</Link>.</>} />
        <Checkbox {...register("marketingOptIn")} label="Je souhaite recevoir les nouveautés et promotions par e-mail (désinscription possible à tout moment)." />
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>Créer mon compte</Button>
      </form>
    </Card>
  );
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const schema = z.object({ email: emailSchema });
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const onSubmit = handleSubmit(async (d) => {
    await authClient.requestPasswordReset({ email: d.email, redirectTo: "/reinitialiser-mot-de-passe" });
    setSent(true); // message identique que l'adresse existe ou non
  });
  return (
    <Card title="Mot de passe oublié" footer={<Link href="/connexion" className="font-semibold text-laque underline">Retour à la connexion</Link>}>
      {sent ? (
        <Alert tone="success">Si un compte est associé à cette adresse, vous allez recevoir un e-mail avec un lien de réinitialisation valable 1 heure.</Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <p className="text-encre-doux">Indiquez votre adresse e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
          <Field label="Adresse e-mail" required error={formState.errors.email?.message}>{(p) => <Input {...p} type="email" autoComplete="email" {...register("email")} />}</Field>
          <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>Envoyer le lien</Button>
        </form>
      )}
    </Card>
  );
}

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const invalid = params.get("error") === "INVALID_TOKEN" || !token;
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema) });
  const onSubmit = handleSubmit(async (d) => {
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: d.password, token: token! });
    if (error) setError("Ce lien n'est plus valable. Demandez un nouveau lien de réinitialisation.");
    else router.replace("/connexion?reinitialise=1");
  });
  return (
    <Card title="Nouveau mot de passe">
      {invalid ? (
        <Alert tone="error" title="Lien invalide ou expiré"><Link href="/mot-de-passe-oublie" className="font-semibold underline">Demander un nouveau lien</Link></Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Nouveau mot de passe" required hint="10 caractères minimum, avec au moins une lettre et un chiffre." error={formState.errors.password?.message}>{(p) => <Input {...p} type="password" autoComplete="new-password" {...register("password")} />}</Field>
          <Field label="Confirmer le mot de passe" required error={formState.errors.confirmPassword?.message}>{(p) => <Input {...p} type="password" autoComplete="new-password" {...register("confirmPassword")} />}</Field>
          <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>Enregistrer le mot de passe</Button>
        </form>
      )}
    </Card>
  );
}
