import { requireAdmin } from "@/lib/session";
import { AdminPage, Panel, Table, Td } from "@/components/admin/ui";
import { db } from "@/lib/db";

export const metadata = { title: "Journal" };

export default async function Journal() {
  await requireAdmin();
  const [logs, emails] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 150, include: { actor: { select: { email: true } } } }),
    db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return (
    <AdminPage title="Journal">
      <Panel title="Actions sensibles">
        <Table head={["Date", "Par", "Action", "Élément", "Détails"]}>
          {logs.map((l) => (
            <tr key={l.id}>
              <Td className="whitespace-nowrap">{l.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</Td>
              <Td>{l.actor?.email ?? "—"}</Td>
              <Td className="font-mono text-xs">{l.action}</Td>
              <Td className="text-xs">{l.entityType}{l.entityId ? ` ${l.entityId.slice(0, 10)}` : ""}</Td>
              <Td className="max-w-xs truncate font-mono text-xs">{l.metadata ? JSON.stringify(l.metadata) : ""}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
      <Panel title="E-mails envoyés">
        <Table head={["Date", "Destinataire", "Modèle", "État"]}>
          {emails.map((e) => (
            <tr key={e.id}>
              <Td className="whitespace-nowrap">{e.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</Td>
              <Td>{e.toMasked}</Td>
              <Td className="font-mono text-xs">{e.template}</Td>
              <Td className={e.status === "SENT" ? "text-emerald-700" : "text-red-700"}>{e.status === "SENT" ? "Envoyé" : e.status === "SKIPPED_NO_PROVIDER" ? "Non envoyé (service non configuré)" : `Échec${e.error ? ` : ${e.error}` : ""}`}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </AdminPage>
  );
}
