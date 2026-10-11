import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export const metadata: Metadata = { title: "Confirmez votre adresse e-mail" };

export default function VerifyEmailPage() {
  return (
    <div className="rounded-[2rem] bg-white p-8 text-center">
      <MailCheck className="mx-auto size-12 text-laque" aria-hidden />
      <h1 className="mt-4 font-display text-3xl font-semibold text-reglisse">Vérifiez votre boîte mail</h1>
      <p className="mt-3 leading-relaxed text-encre-doux">
        Si cette adresse peut être utilisée, un e-mail de confirmation vient de vous être envoyé. Cliquez sur le lien qu&apos;il contient (valable 1 heure) pour activer votre compte. Pensez à regarder dans les courriers indésirables.
      </p>
      <Link href="/connexion" className="mt-6 inline-block font-semibold text-laque underline">Aller à la connexion</Link>
    </div>
  );
}
