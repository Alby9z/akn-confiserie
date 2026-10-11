"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FileText, Gauge, Package, Percent, ScrollText, Settings, ShoppingCart, Tags, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Tableau de bord", icon: Gauge },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingCart },
  { href: "/admin/demandes", label: "Demandes et devis", icon: ClipboardList },
  { href: "/admin/produits", label: "Produits et stocks", icon: Package },
  { href: "/admin/categories", label: "Catégories", icon: Tags },
  { href: "/admin/codes-promo", label: "Codes promo", icon: Percent },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/contenu", label: "Contenus et paramètres", icon: Settings },
  { href: "/admin/pages-legales", label: "Pages légales", icon: FileText },
  { href: "/admin/journal", label: "Journal", icon: ScrollText },
];

export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium", active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white")}>
                <Icon className="size-4" aria-hidden />
                <span className="flex-1">{label}</span>
                {badges[href] ? <span className="rounded-full bg-laque-vif px-2 text-xs font-bold text-white">{badges[href]}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
