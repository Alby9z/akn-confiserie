/** Tous les montants sont manipulés en centimes entiers. */

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function formatPrice(cents: number): string {
  return eur.format(cents / 100);
}

/** Convertit une saisie « 4,90 » / « 4.90 » en centimes, ou null si invalide. */
export function parsePriceToCents(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [euros, dec = ""] = normalized.split(".");
  return Number(euros) * 100 + Number(dec.padEnd(2, "0"));
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Prix au kilo arrondi au centime, si le poids net est connu. */
export function pricePerKgCents(priceCents: number, netWeightGrams: number | null | undefined): number | null {
  if (!netWeightGrams || netWeightGrams <= 0) return null;
  return Math.round((priceCents * 1000) / netWeightGrams);
}
