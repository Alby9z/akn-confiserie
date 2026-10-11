import { requireUser } from "@/lib/session";
import { DeletionForm } from "@/components/account/forms";
import { Alert } from "@/components/ui/feedback";

export const metadata = { title: "Supprimer mon compte" };

export default async function DeletionPage() {
  const user = await requireUser();
  return (
    <section className="max-w-xl space-y-5">
      <h1 className="font-display text-3xl text-reglisse">Supprimer mon compte</h1>
      <p className="leading-relaxed text-encre-doux">
        La suppression efface vos informations personnelles, adresses, favoris et votre accès au compte. Les données des commandes passées sont conservées le temps imposé par les obligations comptables, puis supprimées.
      </p>
      {user.deletionRequestedAt ? (
        <Alert tone="info" title="Demande enregistrée">Votre demande du {user.deletionRequestedAt.toLocaleDateString("fr-FR")} est en cours de traitement.</Alert>
      ) : (
        <div className="rounded-3xl bg-white p-6"><DeletionForm /></div>
      )}
    </section>
  );
}
