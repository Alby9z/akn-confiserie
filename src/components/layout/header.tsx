import Image from "next/image";
import Link from "next/link";
import { NAV } from "@/lib/site";
import { CartButton, CategoriesMenu, MobileMenu, SearchToggle, UserLink } from "./header-client";

export function Header({ categories, isLoggedIn, announcement }: { categories: { name: string; slug: string }[]; isLoggedIn: boolean; announcement?: string | null }) {
  return (
    <header className="sticky top-0 z-50 bg-reglisse/95 text-guimauve backdrop-blur supports-[backdrop-filter]:bg-reglisse/85">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-reglisse">
        Aller au contenu
      </a>
      {announcement && <p className="bg-laque px-4 py-1.5 text-center text-sm font-medium text-white">{announcement}</p>}
      <div className="container-page relative flex h-[4.25rem] items-center gap-2">
        <MobileMenu categories={categories} isLoggedIn={isLoggedIn} />
        <Link href="/" className="mr-auto flex items-center gap-3 lg:mr-6" aria-label="AKN Confiserie 90 — accueil">
          <Image src="/brand/logo.webp" alt="" width={52} height={52} className="size-[3.25rem] rounded-full" priority />
          <span className="hidden font-display text-xl leading-none text-white sm:block">
            AKN <span className="text-or-clair">Confiserie 90</span>
          </span>
        </Link>
        <nav aria-label="Navigation principale" className="mr-auto hidden items-center gap-1 lg:flex">
          <CategoriesMenu categories={categories} />
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-sm font-medium text-guimauve hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <SearchToggle />
        <UserLink isLoggedIn={isLoggedIn} />
        <CartButton />
      </div>
    </header>
  );
}
