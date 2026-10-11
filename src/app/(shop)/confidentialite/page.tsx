import type { Metadata } from "next";
import { LegalPageView } from "@/components/shop/legal-page";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default function Page() {
  return <LegalPageView slug="CONFIDENTIALITE" />;
}
