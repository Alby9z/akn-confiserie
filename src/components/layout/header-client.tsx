"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/components/shop/cart-provider";
import { NAV } from "@/lib/site";
import { cn } from "@/lib/utils";

type Cat = { name: string; slug: string };

export function CartButton() {
  const { count, ready, lastAdded } = useCart();
  return (
    <Link href="/panier" className="relative inline-flex size-11 items-center justify-center rounded-full text-guimauve hover:bg-white/10" aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`}>
      <ShoppingBag className="size-5.5" aria-hidden />
      {ready && count > 0 && (
        <span key={lastAdded} className={cn("absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-laque-vif px-1.5 text-center text-xs font-bold leading-5 text-white", lastAdded > 0 && "animate-[pop_.5s_ease-out]")} aria-hidden>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function SearchToggle() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex size-11 items-center justify-center rounded-full text-guimauve hover:bg-white/10" aria-expanded={open} aria-controls="recherche-entete" aria-label="Rechercher un produit">
        {open ? <X className="size-5" aria-hidden /> : <Search className="size-5" aria-hidden />}
      </button>
      {open && (
        <form
          id="recherche-entete"
          role="search"
          className="absolute inset-x-0 top-full border-t border-white/10 bg-reglisse px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            router.push(`/boutique${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
          }}
        >
          <div className="mx-auto flex max-w-2xl gap-2">
            <label htmlFor="q-entete" className="sr-only">Rechercher un bonbon</label>
            <input ref={inputRef} id="q-entete" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un bonbon, une réglisse…" className="h-11 flex-1 rounded-full border border-white/20 bg-white/10 px-4 text-white placeholder:text-white/55 focus:border-or-clair focus:outline-none" maxLength={80} />
            <button type="submit" className="h-11 rounded-full bg-laque px-5 font-semibold text-white hover:bg-laque-vif">Rechercher</button>
          </div>
        </form>
      )}
    </>
  );
}

export function CategoriesMenu({ categories }: { categories: Cat[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  if (categories.length === 0) return null;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="menu-categories" className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-guimauve hover:text-white">
        Catégories <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul id="menu-categories" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)} className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-or/40 bg-reglisse p-2 shadow-2xl">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/categorie/${c.slug}`} className="block rounded-xl px-3 py-2 text-sm text-guimauve hover:bg-white/10 hover:text-white">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MobileMenu({ categories, isLoggedIn }: { categories: Cat[]; isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} className="inline-flex size-11 items-center justify-center rounded-full text-guimauve hover:bg-white/10" aria-label="Ouvrir le menu" aria-expanded={open} aria-controls="menu-mobile">
        <Menu className="size-6" aria-hidden />
      </button>
      {open && (
        <div id="menu-mobile" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)} role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[60] overflow-y-auto bg-reglisse px-5 pb-10 pt-4 text-guimauve">
          <div className="flex justify-end">
            <button type="button" onClick={() => setOpen(false)} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-white/10" aria-label="Fermer le menu">
              <X className="size-6" aria-hidden />
            </button>
          </div>
          <nav aria-label="Navigation principale" className="mt-2">
            <ul className="space-y-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="block rounded-xl px-3 py-3 font-display text-2xl text-white hover:bg-white/10">
                    {n.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={isLoggedIn ? "/compte" : "/connexion"} className="block rounded-xl px-3 py-3 font-display text-2xl text-white hover:bg-white/10">
                  {isLoggedIn ? "Mon compte" : "Se connecter"}
                </Link>
              </li>
            </ul>
            {categories.length > 0 && (
              <>
                <p className="mt-8 px-3 text-sm font-semibold text-or-clair">Nos catégories</p>
                <ul className="mt-2 flex flex-wrap gap-2 px-3">
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/categorie/${c.slug}`} className="inline-block rounded-full border border-or/50 px-4 py-2 text-sm hover:bg-white/10">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}

export function UserLink({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <Link href={isLoggedIn ? "/compte" : "/connexion"} className="hidden size-11 items-center justify-center rounded-full text-guimauve hover:bg-white/10 sm:inline-flex" aria-label={isLoggedIn ? "Mon compte" : "Se connecter"}>
      <User className="size-5" aria-hidden />
    </Link>
  );
}
