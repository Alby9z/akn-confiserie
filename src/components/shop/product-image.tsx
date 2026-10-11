import Image from "next/image";
import { Candy } from "lucide-react";
import { mediaUrl } from "@/lib/storage-url";
import { cn } from "@/lib/utils";

/** Photo produit, ou emplacement neutre tant qu'aucune vraie photo n'a été ajoutée. */
export function ProductImage({ image, name, sizes, priority, className }: { image?: { storageKey: string; alt: string } | null; name: string; sizes: string; priority?: boolean; className?: string }) {
  if (!image) {
    return (
      <div className={cn("flex size-full flex-col items-center justify-center gap-2 bg-guimauve text-laque/50", className)} role="img" aria-label={`${name} — photo à venir`}>
        <Candy className="size-10" aria-hidden />
        <span className="text-xs font-medium text-encre-doux">Photo à venir</span>
      </div>
    );
  }
  return <Image src={mediaUrl(image.storageKey)} alt={image.alt || name} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
}
