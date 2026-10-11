import { requireAdmin } from "@/lib/session";
import { AdminPage, btnCls, btnSecondaryCls, inputCls, L, Panel, Table, Td } from "@/components/admin/ui";
import { saveCoupon, toggleCoupon } from "@/app/admin/_actions/catalog";
import { db } from "@/lib/db";
import { centsToInput, formatPrice } from "@/lib/money";

export const metadata = { title: "Codes promo" };

export default async function Coupons({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <AdminPage title="Codes promotionnels" searchParams={await searchParams}>
      <Panel title="Nouveau code">
        <form action={saveCoupon} className="grid gap-3 md:grid-cols-4">
          <L label="Code *"><input name="code" required className={`${inputCls} uppercase`} placeholder="BIENVENUE10" /></L>
          <L label="Type"><select name="type" className={inputCls}><option value="PERCENT">Pourcentage</option><option value="FIXED">Montant fixe (€)</option></select></L>
          <L label="Valeur *" hint="10 = 10 % ou 10,00 €"><input name="value" required className={inputCls} /></L>
          <L label="Minimum d'achat (€)"><input name="minSubtotal" className={inputCls} /></L>
          <L label="Début"><input type="date" name="startsAt" className={inputCls} /></L>
          <L label="Fin"><input type="date" name="endsAt" className={inputCls} /></L>
          <L label="Utilisations max."><input type="number" min={1} name="maxUses" className={inputCls} /></L>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="isActive" defaultChecked className="accent-laque" /> Actif</label>
          <div className="md:col-span-4"><button className={btnCls}>Créer le code</button></div>
        </form>
      </Panel>
      {coupons.length > 0 && (
        <Table head={["Code", "Réduction", "Conditions", "Utilisations", "État", ""]}>
          {coupons.map((c) => (
            <tr key={c.id}>
              <Td className="font-mono font-semibold">{c.code}</Td>
              <Td>{c.type === "PERCENT" ? `${c.value} %` : formatPrice(c.value)}</Td>
              <Td className="text-xs text-slate-600">
                {c.minSubtotalCents != null && <span className="block">Dès {centsToInput(c.minSubtotalCents)} €</span>}
                {c.startsAt && <span className="block">Du {c.startsAt.toLocaleDateString("fr-FR")}</span>}
                {c.endsAt && <span className="block">Au {c.endsAt.toLocaleDateString("fr-FR")}</span>}
              </Td>
              <Td>{c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ""}</Td>
              <Td>{c.isActive ? "Actif" : "Inactif"}</Td>
              <Td><form action={toggleCoupon}><input type="hidden" name="id" value={c.id} /><button className={btnSecondaryCls}>{c.isActive ? "Désactiver" : "Activer"}</button></form></Td>
            </tr>
          ))}
        </Table>
      )}
    </AdminPage>
  );
}
