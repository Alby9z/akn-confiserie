/** URL publique d'un fichier stocké (utilisable côté client comme serveur). */
export function mediaUrl(key: string): string {
  return `/media/${key}`;
}
