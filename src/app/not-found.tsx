import Link from "next/link";

/** 404 hors du site public (ex. administration) */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-reglisse px-6 text-center text-guimauve">
      <p className="font-display text-8xl font-semibold text-laque-vif">404</p>
      <h1 className="mt-4 font-display text-3xl text-white">Page introuvable</h1>
      <Link href="/" className="mt-8 rounded-full bg-laque px-6 py-3 font-semibold text-white hover:bg-laque-vif">Retour à l&apos;accueil</Link>
    </main>
  );
}
