import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/shop/page-header";
import { ButtonLink } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "La boutique",
  description: "AKN Confiserie 90, boutique de bonbons et confiseries au 23 boulevard Joffre à Belfort.",
  alternates: { canonical: "/a-propos" },
};

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="La boutique" />
      <div className="container-page grid items-start gap-12 md:grid-cols-[1.3fr_1fr]">
        <div className="max-w-2xl text-lg leading-relaxed">
          {s.aboutText ? (
            <p className="whitespace-pre-line">{s.aboutText}</p>
          ) : (
            <p>
              {s.shopName} est une boutique de bonbons et de confiseries installée {s.addressLine ? `au ${s.addressLine} à ${s.city}` : "à Belfort"}. Vous y trouverez des bonbons à l&apos;unité ou en sachet, des compositions à offrir, et nous préparons sur demande des commandes pour vos fêtes et événements.
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/boutique">Voir la boutique</ButtonLink>
            <ButtonLink href="/contact" variant="secondary">Nous contacter</ButtonLink>
          </div>
        </div>
        <Image src="/brand/logo.webp" alt="Logo AKN Confiserie 90" width={739} height={740} sizes="(min-width:768px) 35vw, 90vw" className="w-full max-w-sm rounded-[2.5rem] bg-black" />
      </div>
    </>
  );
}
