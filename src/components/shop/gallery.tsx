"use client";

import { useState } from "react";
import { ProductImage } from "./product-image";
import { cn } from "@/lib/utils";

export function Gallery({ images, name }: { images: { storageKey: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-drop)] bg-guimauve">
        <ProductImage image={images[active] ?? null} name={name} sizes="(min-width:768px) 50vw, 100vw" priority />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Autres photos">
          {images.map((img, i) => (
            <li key={img.storageKey}>
              <button type="button" onClick={() => setActive(i)} aria-label={`Afficher la photo ${i + 1}`} aria-pressed={i === active} className={cn("relative block size-20 overflow-hidden rounded-2xl border-2", i === active ? "border-laque" : "border-transparent opacity-75 hover:opacity-100")}>
                <ProductImage image={img} name={name} sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
