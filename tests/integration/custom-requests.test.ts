import { beforeEach, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { db } from "@/lib/db";
import { submitCustomRequest } from "@/app/(shop)/evenements/actions";
import { replyToRequest } from "@/app/admin/_actions/requests";
import { resetDb, setRequestHeaders, settings } from "../helpers";

function form(over: Record<string, string | File> = {}) {
  const fd = new FormData();
  const base: Record<string, string> = { fullName: "Léa Dupont", email: "lea@example.test", phone: "06 11 22 33 44", eventType: "BIRTHDAY", description: "Anniversaire pour 25 enfants, thème rose et doré.", consent: "on", guestCount: "25" };
  for (const [k, v] of Object.entries({ ...base, ...over })) fd.set(k, v);
  return fd;
}

beforeEach(async () => {
  await resetDb();
  await settings();
  setRequestHeaders({ "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200)}` });
  await rm(".test-storage", { recursive: true, force: true });
});

describe("demandes événementielles", () => {
  it("enregistre la demande, attribue une référence et notifie client + boutique", async () => {
    const res = await submitCustomRequest({ status: "idle" }, form());
    expect(res.status).toBe("success");
    const r = await db.customRequest.findFirstOrThrow();
    expect(r.reference).toMatch(/^DEM-[2-9A-Z]{6}$/);
    expect(r.status).toBe("NEW");
    expect(r.guestCount).toBe(25);
    expect(await db.emailLog.count({ where: { template: "request_received" } })).toBe(1);
    expect(await db.emailLog.count({ where: { template: "admin_new_request" } })).toBe(1);
  });

  it("accepte une pièce jointe valide et refuse un faux fichier", async () => {
    const pdf = new File([Buffer.from("%PDF-1.4 contenu de test")], "maquette.pdf", { type: "application/pdf" });
    expect((await submitCustomRequest({ status: "idle" }, form({ attachment: pdf }))).status).toBe("success");
    const r = await db.customRequest.findFirstOrThrow();
    expect(r.attachmentMime).toBe("application/pdf");
    const fake = new File([Buffer.from("<?php system($_GET['c']); ?>")], "photo.jpg", { type: "image/jpeg" });
    const res = await submitCustomRequest({ status: "idle" }, form({ attachment: fake }));
    expect(res.status).toBe("error");
    expect(await db.customRequest.count()).toBe(1);
  });

  it("ignore silencieusement les robots (champ piège)", async () => {
    const res = await submitCustomRequest({ status: "idle" }, form({ website: "http://spam.example" }));
    expect(res.status).toBe("success");
    expect(await db.customRequest.count()).toBe(0);
  });

  it("limite le nombre de demandes par adresse IP", async () => {
    setRequestHeaders({ "x-forwarded-for": "192.0.2.77" });
    const results = [];
    for (let i = 0; i < 7; i++) results.push((await submitCustomRequest({ status: "idle" }, form())).status);
    expect(results.filter((s) => s === "success")).toHaveLength(5);
    expect(results.at(-1)).toBe("error");
  });

  it("valide les champs obligatoires côté serveur", async () => {
    const res = await submitCustomRequest({ status: "idle" }, form({ email: "invalide", description: "court" }));
    expect(res.status).toBe("error");
    if (res.status === "error") expect(Object.keys(res.fields ?? {})).toEqual(expect.arrayContaining(["email", "description"]));
  });

  it("n'accepte jamais automatiquement une demande", async () => {
    await submitCustomRequest({ status: "idle" }, form());
    const r = await db.customRequest.findFirstOrThrow();
    expect(r.status).toBe("NEW");
    expect(r.quotedAmountCents).toBeNull();
    // Une cliente ne peut pas répondre / envoyer un devis à la place de la boutique
    const fd = new FormData();
    fd.set("id", r.id);
    fd.set("message", "Devis accepté !");
    fd.set("quote", "1,00");
    await expect(replyToRequest(fd)).rejects.toThrow("FORBIDDEN");
  });
});
