"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/compte", label: "Tableau de bord" },
  { href: "/compte/commandes", label: "Mes commandes" },
  { href: "/compte/demandes", label: "Mes demandes" },
  { href: "/compte/favoris", label: "Mes favoris" },
  { href: "/compte/adresses", label: "Mes adresses" },
  { href: "/compte/informations", label: "Mes informations" },
  { href: "/compte/preferences", label: "Communications" },
  { href: "/compte/securite", label: "Sécurité et appareils" },
  { href: "/compte/suppression", label: "Supprimer mon compte" },
];

export function AccountNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Mon compte">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
        {LINKS.map((l) => {
          const active = l.href === "/compte" ? pathname === "/compte" : pathname.startsWith(l.href);
          return (
            <li key={l.href} className="shrink-0">
              <Link href={l.href} aria-current={active ? "page" : undefined} className={cn("block rounded-full px-4 py-2 text-sm font-medium", active ? "bg-reglisse text-white" : "hover:bg-guimauve")}>
                {l.label}
              </Link>
            </li>
          );
        })}
        {isAdmin && (
          <li className="shrink-0">
            <Link href="/admin" className="block rounded-full px-4 py-2 text-sm font-semibold text-laque hover:bg-guimauve">Administration</Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
