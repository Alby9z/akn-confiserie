import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Stockage de fichiers sur disque (hors du dossier public).
 * - products/ : photos produits, servies publiquement par /media/products/...
 * - requests/ : pièces jointes des demandes, accessibles uniquement par l'administration
 */
const ROOT = resolve(/*turbopackIgnore: true*/ env.STORAGE_DIR);

export type Bucket = "products" | "requests";

type Detected = { mime: string; ext: string };

/** Détection par signature binaire : on ne se fie jamais au type annoncé par le navigateur. */
export function detectFileType(buf: Buffer): Detected | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  return null;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type SaveResult = { ok: true; key: string; mime: string; size: number } | { ok: false; error: string };

export async function saveUpload(file: File, bucket: Bucket, allowed: string[]): Promise<SaveResult> {
  if (file.size === 0) return { ok: false, error: "Le fichier est vide." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Le fichier dépasse 5 Mo." };
  const buf = Buffer.from(await file.arrayBuffer());
  const type = detectFileType(buf);
  if (!type || !allowed.includes(type.mime)) return { ok: false, error: "Type de fichier non autorisé." };
  const key = `${bucket}/${Date.now()}-${randomBytes(8).toString("hex")}.${type.ext}`;
  const path = safePath(key);
  if (!path) return { ok: false, error: "Chemin invalide." };
  await mkdir(/*turbopackIgnore: true*/ join(ROOT, bucket), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ path, buf, { flag: "wx" });
  return { ok: true, key, mime: type.mime, size: buf.length };
}

/** Résout une clé en chemin absolu en empêchant toute sortie du dossier (path traversal). */
export function safePath(key: string): string | null {
  if (!/^(products|requests)\/[A-Za-z0-9._-]+$/.test(key)) return null;
  const full = resolve(ROOT, key);
  if (!full.startsWith(ROOT + sep)) return null;
  return full;
}

export async function readStored(key: string): Promise<{ data: Buffer; mime: string } | null> {
  const path = safePath(key);
  if (!path) return null;
  try {
    const data = await readFile(/*turbopackIgnore: true*/ path);
    const type = detectFileType(data);
    if (!type) return null;
    return { data, mime: type.mime };
  } catch {
    return null;
  }
}

export async function deleteStored(key: string) {
  const path = safePath(key);
  if (path) await unlink(/*turbopackIgnore: true*/ path).catch(() => {});
}

export { mediaUrl } from "@/lib/storage-url";
