import type { Metadata } from "next";
import { LegalPageView } from "@/components/shop/legal-page";

export const metadata: Metadata = { title: "Conditions générales de vente", alternates: { canonical: "/cgv" } };

export default function Page() {
  return <LegalPageView slug="CGV" />;
}
