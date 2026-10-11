import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpForm } from "@/components/account/auth-forms";

export const metadata: Metadata = { title: "Créer un compte" };

export default function Page() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
