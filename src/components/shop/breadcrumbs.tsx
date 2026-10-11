import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items, appUrl }: { items: Crumb[]; appUrl: string }) {
  const all: Crumb[] = [{ label: "Accueil", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Fil d'Ariane" className="text-sm text-encre-doux">
        <ol className="flex flex-wrap items-center gap-1">
          {all.map((c, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
              {c.href && i < all.length - 1 ? (
                <Link href={c.href} className="hover:text-laque">{c.label}</Link>
              ) : (
                <span aria-current="page" className="font-medium text-encre">{c.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: `${appUrl}${c.href}` } : {}) })),
        }}
      />
    </>
  );
}
