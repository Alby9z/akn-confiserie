import type { Metadata } from "next";
import { LegalPageView } from "@/components/shop/legal-page";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default function Page() {
  return <LegalPageView slug="MENTIONS_LEGALES" />;
}
