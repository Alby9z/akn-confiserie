import type { Metadata } from "next";
import { PageHeader } from "@/components/shop/page-header";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { CustomRequestForm } from "@/components/shop/custom-request-form";
import { appUrl } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Bonbons pour anniversaires et événements à Belfort",
  description: "Anniversaire, mariage, baptême, fête d'entreprise : demandez un devis pour vos bonbons, sachets personnalisés et compositions sucrées à Belfort.",
  alternates: { canonical: "/evenements" },
};

const USES = [
  { title: "Anniversaires", text: "Sachets pour les invités, pinata, table de bonbons aux couleurs de la fête." },
  { title: "Mariages et baptêmes", text: "Contenants assortis à votre décoration, bonbons choisis selon vos couleurs." },
  { title: "Événements professionnels", text: "Accueil de salon, cadeaux clients, fêtes d'équipe : quantités adaptées." },
];

export default async function EventsPage() {
  const user = await getCurrentUser();
  return (
    <>
      <PageHeader title="Anniversaires et événements" intro="Racontez-nous votre événement : nous vous proposons une sélection, des quantités et un prix adaptés.">
        <Breadcrumbs appUrl={appUrl} items={[{ label: "Événements" }]} />
      </PageHeader>
      <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-8">
          {USES.map((u) => (
            <div key={u.title} className="border-l-4 border-or pl-5">
              <h2 className="font-display text-2xl text-reglisse">{u.title}</h2>
              <p className="mt-1.5 leading-relaxed text-encre-doux">{u.text}</p>
            </div>
          ))}
          <div className="rounded-3xl bg-reglisse p-6 text-guimauve">
            <h2 className="font-display text-xl text-white">Comment ça se passe</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
              <li>Vous envoyez votre demande avec la date et les quantités.</li>
              <li>Nous vérifions les disponibilités et vous envoyons une proposition chiffrée.</li>
              <li>Vous validez : nous préparons votre commande.</li>
            </ol>
          </div>
        </div>
        <CustomRequestForm
          defaultType="BIRTHDAY"
          types={["BIRTHDAY", "WEDDING", "BAPTISM", "FAMILY", "CORPORATE", "CELEBRATION", "OTHER"]}
          prefill={user ? { fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name, email: user.email, phone: user.phone ?? undefined } : undefined}
        />
      </div>
    </>
  );
}
