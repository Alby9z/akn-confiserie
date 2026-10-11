import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { AccountNav } from "@/components/account/account-nav";
import { SignOutButton } from "@/components/account/sign-out-button";

export const metadata: Metadata = { title: { default: "Mon compte", template: "%s | Mon compte" }, robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="container-page pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-encre-doux">Mon compte</p>
          <p className="font-display text-3xl font-semibold text-reglisse">Bonjour {user.firstName ?? user.name}</p>
        </div>
        <SignOutButton />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[14rem_1fr]">
        <AccountNav isAdmin={user.role === "ADMIN"} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
