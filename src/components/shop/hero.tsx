import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";

const DEFAULT_TITLE = "Des bonbons qui font briller les yeux, à Belfort";
const DEFAULT_TEXT = "Gélifiés, acidulés, réglisses, sucettes et coffrets à composer : choisissez vos douceurs en ligne et récupérez-les à la boutique, boulevard Joffre.";

export function Hero({ title, text }: { title?: string | null; text?: string | null }) {
  return (
    <section className="relative overflow-hidden bg-reglisse text-guimauve" aria-labelledby="hero-titre">
      <div aria-hidden className="pointer-events-none absolute -right-40 top-1/2 size-[46rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(224,32,122,.32),rgba(184,134,42,.10)_45%,transparent_70%)]" />
      <div className="container-page relative grid items-center gap-10 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20">
        <div className="max-w-xl">
          <h1 id="hero-titre" className="font-display text-[2.6rem] font-semibold leading-[1.02] text-white sm:text-6xl">
            {title || DEFAULT_TITLE}
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-guimauve/85">{text || DEFAULT_TEXT}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/boutique" size="lg">Découvrir les bonbons</ButtonLink>
            <ButtonLink href="/evenements" size="lg" variant="gold">Commander pour un événement</ButtonLink>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[26rem]">
          <Image src="/brand/logo.webp" alt="Logo AKN Confiserie 90 : couronne dorée, sucettes, oursons et lettres roses laquées" width={739} height={740} priority sizes="(min-width:768px) 26rem, 80vw" className="relative w-full rounded-full [mask-image:radial-gradient(circle,#000_58%,transparent_71%)]" />
        </div>
      </div>
      <DripEdge />
    </section>
  );
}

/** Coulure rose reprise du ruban du logo : le seul élément décoratif appuyé du site. */
const DRIPS: [number, number, number][] = [
  [40, 22, 30], [130, 16, 18], [210, 26, 44], [330, 18, 22], [420, 24, 36], [540, 14, 16], [610, 28, 48],
  [740, 18, 26], [830, 22, 38], [950, 16, 20], [1030, 26, 42], [1150, 18, 24], [1240, 24, 40], [1350, 16, 20],
];

function DripEdge() {
  return (
    <svg className="drip-edge -mb-px bg-sucre" viewBox="0 0 1440 56" preserveAspectRatio="none" aria-hidden>
      <rect x="0" y="0" width="1440" height="12" fill="var(--color-laque)" />
      {DRIPS.map(([x, w, h]) => (
        <rect key={x} x={x} y={-w} width={w} height={h + w} rx={w / 2} fill="var(--color-laque)" />
      ))}
    </svg>
  );
}
