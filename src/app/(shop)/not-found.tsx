import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="font-display text-8xl font-semibold text-laque">404</p>
      <h1 className="mt-4 font-display text-3xl text-reglisse">Cette page a fondu</h1>
      <p className="mt-3 max-w-md text-encre-doux">La page demandée n&apos;existe pas ou plus. Le produit a peut-être été retiré de la boutique.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/boutique">Voir la boutique</ButtonLink>
        <ButtonLink href="/" variant="secondary">Retour à l&apos;accueil</ButtonLink>
      </div>
    </div>
  );
}
