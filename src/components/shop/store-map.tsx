"use client";

import { MapPin } from "lucide-react";
import { useConsent } from "@/components/layout/consent";

/** Carte OpenStreetMap chargée uniquement avec le consentement « Contenus externes ». */
export function StoreMap({ query, title }: { query: string; title: string }) {
  const { consent, set } = useConsent();
  if (!consent?.externalMedia) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-[var(--radius-drop)] bg-guimauve p-6 text-center">
        <MapPin className="size-8 text-laque" aria-hidden />
        <p className="max-w-xs text-sm text-encre-doux">La carte est fournie par OpenStreetMap. Elle ne s&apos;affiche qu&apos;avec votre accord.</p>
        <button type="button" onClick={() => set(true)} className="rounded-full border-2 border-laque px-4 py-2 text-sm font-semibold text-laque hover:bg-white">
          Afficher la carte
        </button>
      </div>
    );
  }
  return (
    <iframe
      title={title}
      className="aspect-[4/3] w-full rounded-[var(--radius-drop)] border-0"
      loading="lazy"
      referrerPolicy="no-referrer"
      src={`https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${query}&bbox=${bboxAround(query)}`}
    />
  );
}

function bboxAround(latlon: string) {
  const [lat, lon] = latlon.split(",").map(Number);
  const d = 0.006;
  return `${lon - d},${lat - d / 1.6},${lon + d},${lat + d / 1.6}`;
}
