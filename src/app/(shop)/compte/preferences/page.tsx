import { requireUser } from "@/lib/session";
import { PreferencesForm } from "@/components/account/forms";

export const metadata = { title: "Communications" };

export default async function PrefsPage() {
  const user = await requireUser();
  return (
    <section className="max-w-xl">
      <h1 className="font-display text-3xl text-reglisse">Communications</h1>
      <p className="mt-3 text-encre-doux">Les e-mails liés à vos commandes et demandes (confirmation, préparation, réponse) sont toujours envoyés. Vous choisissez ici les e-mails d&apos;information.</p>
      <div className="mt-6 rounded-3xl bg-white p-6"><PreferencesForm marketingOptIn={user.marketingOptIn} /></div>
    </section>
  );
}
