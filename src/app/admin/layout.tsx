import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: { default: "Administration", template: "%s — Administration" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Espace d'administration : visuellement distinct, accès vérifié côté serveur à chaque rendu. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [toPrepare, newRequests] = await Promise.all([
    db.order.count({ where: { status: { in: ["PAID", "PREPARING"] } } }),
    db.customRequest.count({ where: { status: "NEW" } }),
  ]);
  return (
    <div className="min-h-dvh bg-slate-100 font-sans text-slate-900 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="bg-slate-900 p-4 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <Link href="/admin" className="mb-6 block px-3 pt-1 text-lg font-bold text-white">AKN Confiserie — gestion</Link>
        <AdminNav badges={{ "/admin/commandes": toPrepare, "/admin/demandes": newRequests }} />
        <div className="mt-8 space-y-1 border-t border-white/10 px-3 pt-4 text-xs text-slate-400">
          <p className="truncate">{admin.email}</p>
          <Link href="/" className="block text-slate-300 underline hover:text-white">Voir le site</Link>
          <Link href="/compte" className="block text-slate-300 underline hover:text-white">Mon compte</Link>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}
