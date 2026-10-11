import type { Metadata } from "next";
import { PageHeader } from "@/components/shop/page-header";
import { EmptyState } from "@/components/ui/feedback";
import { JsonLd } from "@/components/seo/json-ld";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Questions fréquentes", alternates: { canonical: "/faq" } };

export default async function FaqPage() {
  const faqs = await db.faq.findMany({ where: { isPublished: true }, orderBy: { position: "asc" } });
  return (
    <>
      <PageHeader title="Questions fréquentes" />
      <div className="container-page max-w-3xl">
        {faqs.length === 0 ? (
          <EmptyState title="Bientôt des réponses ici">Une question ? Appelez-nous ou passez à la boutique.</EmptyState>
        ) : (
          <div className="divide-y divide-guimauve-2 border-y border-guimauve-2">
            {faqs.map((f) => (
              <details key={f.id} className="py-5">
                <summary className="cursor-pointer font-display text-xl text-reglisse">{f.question}</summary>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-encre-doux">{f.answer}</p>
              </details>
            ))}
          </div>
        )}
        {faqs.length > 0 && (
          <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }} />
        )}
      </div>
    </>
  );
}
