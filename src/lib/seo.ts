import type { Settings } from "@/lib/settings";

/** LocalBusiness/Store : uniquement les informations confirmées et renseignées. */
export function localBusinessJsonLd(s: Settings, appUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: s.shopName,
    url: appUrl,
    image: `${appUrl}/brand/logo.webp`,
    ...(s.phone ? { telephone: s.phone } : {}),
    ...(s.email ? { email: s.email } : {}),
    ...(s.addressLine && s.postalCode && s.city
      ? { address: { "@type": "PostalAddress", streetAddress: s.addressLine, postalCode: s.postalCode, addressLocality: s.city, addressCountry: "FR" } }
      : {}),
    ...(s.mapLatitude != null && s.mapLongitude != null ? { geo: { "@type": "GeoCoordinates", latitude: s.mapLatitude, longitude: s.mapLongitude } } : {}),
    ...([s.instagramUrl, s.facebookUrl].filter(Boolean).length ? { sameAs: [s.instagramUrl, s.facebookUrl].filter(Boolean) } : {}),
  };
}
