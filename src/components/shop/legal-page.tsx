import { notFound } from "next/navigation";
import { PageHeader } from "./page-header";
import { SimpleText } from "./simple-text";
import { Alert } from "@/components/ui/feedback";
import { db } from "@/lib/db";
import type { LegalSlug } from "@/generated/prisma/enums";

export async function LegalPageView({ slug }: { slug: LegalSlug }) {
  const page = await db.legalPage.findUnique({ where: { slug } });
  if (!page) notFound();
  return (
    <>
      <PageHeader title={page.title} />
      <div className="container-page">
        {!page.isValidated && (
          <Alert tone="warning" className="mb-8 max-w-3xl" title="Document en cours de validation">
            Ce texte est un projet en attente de validation. Les passages surlignés restent à compléter. Pour toute question, contactez la boutique.
          </Alert>
        )}
        <SimpleText content={page.content} />
        {page.isValidated && page.validatedAt && <p className="mt-10 text-sm text-encre-doux">Dernière mise à jour : {page.validatedAt.toLocaleDateString("fr-FR")}</p>}
      </div>
    </>
  );
}
