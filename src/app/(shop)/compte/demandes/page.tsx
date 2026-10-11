import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatPrice } from "@/lib/money";
import { REQUEST_STATUS_LABELS } from "@/lib/request-status";
import { EVENT_TYPES } from "@/lib/validation/schemas";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Mes demandes" };

export default async function RequestsPage() {
  const user = await requireUser();
  const requests = await db.customRequest.findMany({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
    orderBy: { createdAt: "desc" },
    include: { messages: { where: { isInternal: false, author: { not: "SYSTEM" } }, orderBy: { createdAt: "asc" } } },
  });
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl text-reglisse">Mes demandes personnalisées</h1>
        <ButtonLink href="/sur-mesure" size="sm" variant="secondary">Nouvelle demande</ButtonLink>
      </div>
      {requests.length === 0 ? (
        <EmptyState title="Aucune demande" />
      ) : (
        requests.map((r) => (
          <article key={r.id} className="rounded-3xl bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl text-reglisse">{r.reference} — {EVENT_TYPES[r.eventType]}</h2>
              <Badge tone={r.status === "QUOTE_SENT" ? "laque" : "neutral"}>{REQUEST_STATUS_LABELS[r.status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-encre-doux">Envoyée le {r.createdAt.toLocaleDateString("fr-FR")}{r.eventDate ? ` — pour le ${r.eventDate.toLocaleDateString("fr-FR")}` : ""}</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{r.description}</p>
            {r.quotedAmountCents != null && <p className="mt-3 font-semibold">Montant proposé : {formatPrice(r.quotedAmountCents)} TTC</p>}
            {r.messages.length > 0 && (
              <ul className="mt-4 space-y-3 border-t border-guimauve-2 pt-4">
                {r.messages.map((m) => (
                  <li key={m.id} className={m.author === "ADMIN" ? "rounded-2xl bg-guimauve/60 p-4 text-sm" : "rounded-2xl bg-sucre p-4 text-sm"}>
                    <p className="text-xs font-semibold text-encre-doux">{m.author === "ADMIN" ? "La boutique" : "Vous"} — {m.createdAt.toLocaleDateString("fr-FR")}</p>
                    <p className="mt-1 whitespace-pre-line">{m.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))
      )}
    </section>
  );
}
