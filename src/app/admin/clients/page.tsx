import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { AdminPage, btnSecondaryCls, inputCls, Table, Td } from "@/components/admin/ui";
import { db } from "@/lib/db";

export const metadata = { title: "Clients" };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; suppression?: string; ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = sp.q?.slice(0, 80);
  const users = await db.user.findMany({
    where: {
      ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
      ...(sp.suppression === "1" ? { deletionRequestedAt: { not: null } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true, deletionRequestedAt: true, _count: { select: { orders: true } } },
  });
  const pendingDeletions = await db.user.count({ where: { deletionRequestedAt: { not: null } } });
  return (
    <AdminPage title="Clients" searchParams={sp}>
      <form method="get" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Nom ou e-mail" aria-label="Recherche" className={`${inputCls} max-w-xs`} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="suppression" value="1" defaultChecked={sp.suppression === "1"} /> Demandes de suppression ({pendingDeletions})</label>
        <button className={btnSecondaryCls}>Filtrer</button>
      </form>
      <Table head={["Client", "Inscrit le", "Commandes", "État"]}>
        {users.map((u) => (
          <tr key={u.id}>
            <Td><Link href={`/admin/clients/${u.id}`} className="font-semibold underline">{u.name}</Link><span className="block text-xs text-slate-500">{u.email}</span></Td>
            <Td>{u.createdAt.toLocaleDateString("fr-FR")}</Td>
            <Td>{u._count.orders}</Td>
            <Td className="text-xs">{u.role === "ADMIN" && <span className="mr-1 rounded bg-slate-900 px-1.5 py-0.5 text-white">admin</span>}{!u.emailVerified && "E-mail non confirmé "}{u.deletionRequestedAt && <span className="font-semibold text-red-700">Suppression demandée</span>}</Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
