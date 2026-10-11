import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="container-page flex justify-center py-12 sm:py-16"><div className="w-full max-w-md">{children}</div></div>;
}
