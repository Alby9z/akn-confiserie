import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { AddressManager } from "@/components/account/address-manager";

export const metadata = { title: "Mes adresses" };

export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  return (
    <section className="max-w-2xl">
      <h1 className="font-display text-3xl text-reglisse">Mes adresses</h1>
      <div className="mt-6"><AddressManager addresses={addresses} /></div>
    </section>
  );
}
