import type { Metadata } from "next";
import { PageHeader } from "@/components/shop/page-header";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { CustomRequestForm } from "@/components/shop/custom-request-form";
import { appUrl } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Grosses commandes et demandes personnalisées",
  description: "Bonbons en grande quantité, sachets personnalisés, coffrets et compositions sur mesure à Belfort : demandez votre devis.",
  alternates: { canonical: "/sur-mesure" },
};

export default async function CustomPage() {
  const user = await getCurrentUser();
  return (
    <>
      <PageHeader title="Grosses commandes et sur mesure" intro="Quantités importantes, sachets personnalisés, coffrets composés selon vos envies : décrivez votre besoin, nous vous répondons avec un devis.">
        <Breadcrumbs appUrl={appUrl} items={[{ label: "Sur mesure" }]} />
      </PageHeader>
      <div className="container-page max-w-4xl">
        <CustomRequestForm
          defaultType="BULK_ORDER"
          types={["BULK_ORDER", "CUSTOM_BAGS", "CUSTOM_BOX", "CORPORATE", "OTHER"]}
          prefill={user ? { fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name, email: user.email, phone: user.phone ?? undefined } : undefined}
        />
      </div>
    </>
  );
}
