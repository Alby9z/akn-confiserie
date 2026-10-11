import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export const getSettings = cache(async () => {
  const s = await db.siteSettings.findUnique({ where: { id: 1 } });
  return s ?? (await db.siteSettings.create({ data: { id: 1 } }));
});

export type Settings = Awaited<ReturnType<typeof getSettings>>;

export function hasStoreAddress(s: Settings) {
  return Boolean(s.addressLine && s.postalCode && s.city);
}

export function directionsUrl(s: Settings) {
  const q = encodeURIComponent(`${s.addressLine}, ${s.postalCode} ${s.city}, France`);
  return `https://www.openstreetmap.org/search?query=${q}`;
}

export function googleDirectionsUrl(s: Settings) {
  const q = encodeURIComponent(`${s.addressLine}, ${s.postalCode} ${s.city}, France`);
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}
