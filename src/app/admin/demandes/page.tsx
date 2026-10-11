import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { AdminPage, btnSecondaryCls, inputCls, Table, Td } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { REQUEST_STATUS_LABELS } from "@/lib/request-status";
import { EVENT_TYPES } from "@/lib/validation/schemas";
import { CustomRequestStatus, EventType } from "@/generated/prisma/enums";

export const metadata = { title: "Demandes" };

export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ statut?: string; type?: string; q?: string; ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (Object.values(CustomRequestStatus) as string[]).includes(sp.statut ?? "") ? (sp.statut as CustomRequestStatus) : undefined;
  const type = (Object.values(EventType) as string[]).includes(sp.type ?? "") ? (sp.type as EventType) : undefined;
  const q = sp.q?.slice(0, 80);
  const requests = await db.customRequest.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(type ? { eventType: type } : {}),
      ...(q ? { OR: [{ reference: { contains: q, mode: "insensitive" } }, { fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take: 300,
  });
  return (
    <AdminPage title="Demandes et devis" searchParams={sp}>
      <form method="get" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Référence, nom, e-mail" aria-label="Recherche" className={`${inputCls} max-w-xs`} />
        <select name="statut" defaultValue={sp.statut ?? ""} aria-label="Statut" className={`${inputCls} max-w-[12rem]`}><option value="">Tous les statuts</option>{Object.entries(REQUEST_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="type" defaultValue={sp.type ?? ""} aria-label="Type" className={`${inputCls} max-w-[14rem]`}><option value="">Tous les types</option>{Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className={btnSecondaryCls}>Filtrer</button>
      </form>
      {requests.length === 0 ? <p className="rounded-xl bg-white p-8 text-center text-slate-600">Aucune demande.</p> : (
        <Table head={["Référence", "Reçue le", "Client", "Type", "Date prévue", "Statut"]}>
          {requests.map((r) => (
            <tr key={r.id} className={r.status === "NEW" ? "bg-pink-50/60" : undefined}>
              <Td><Link href={`/admin/demandes/${r.id}`} className="font-semibold text-laque underline">{r.reference}</Link></Td>
              <Td className="whitespace-nowrap">{r.createdAt.toLocaleDateString("fr-FR")}</Td>
              <Td>{r.fullName}<span className="block text-xs text-slate-500">{r.email}</span></Td>
              <Td>{EVENT_TYPES[r.eventType]}</Td>
              <Td>{r.eventDate?.toLocaleDateString("fr-FR") ?? "—"}</Td>
              <Td>{REQUEST_STATUS_LABELS[r.status]}</Td>
            </tr>
          ))}
        </Table>
      )}
    </AdminPage>
  );
}
