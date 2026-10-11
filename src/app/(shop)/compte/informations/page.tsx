import { requireUser } from "@/lib/session";
import { ProfileForm } from "@/components/account/forms";

export const metadata = { title: "Mes informations" };

export default async function InfoPage() {
  const user = await requireUser();
  return (
    <section className="max-w-xl">
      <h1 className="font-display text-3xl text-reglisse">Mes informations</h1>
      <div className="mt-6 rounded-3xl bg-white p-6"><ProfileForm user={user} /></div>
    </section>
  );
}
