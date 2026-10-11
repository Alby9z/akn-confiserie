import { describe, expect, it } from "vitest";
import { allowedManualTransitions, canTransition } from "@/lib/order-status";
import { checkoutSchema, customRequestSchema, signUpSchema } from "@/lib/validation/schemas";
import { detectFileType, safePath } from "@/lib/storage";
import { escapeHtml } from "@/lib/email/templates";

describe("transitions de commande", () => {
  it("interdit de marquer payée manuellement", () => {
    expect(canTransition("PENDING_PAYMENT", "PAID", "PICKUP")).toBe(false);
    expect(allowedManualTransitions("PENDING_PAYMENT", "PICKUP")).toEqual(["CANCELLED"]);
  });
  it("adapte « prête / expédiée » au mode de remise", () => {
    expect(allowedManualTransitions("PAID", "PICKUP")).toEqual(["PREPARING", "READY_FOR_PICKUP"]);
    expect(allowedManualTransitions("PAID", "DELIVERY")).toEqual(["PREPARING", "SHIPPED"]);
  });
  it("n'autorise rien après remboursement ou annulation", () => {
    expect(allowedManualTransitions("REFUNDED", "PICKUP")).toEqual([]);
    expect(allowedManualTransitions("CANCELLED", "DELIVERY")).toEqual([]);
  });
});

describe("validation des formulaires", () => {
  const base = { lines: [{ productId: "p1", quantity: 2 }], fulfillment: "PICKUP", email: "a@b.fr", firstName: "A", lastName: "B", phone: "06 01 02 03 04", acceptTerms: true };
  it("accepte une commande en retrait", () => {
    expect(checkoutSchema.safeParse(base).success).toBe(true);
  });
  it("exige l'adresse en livraison", () => {
    expect(checkoutSchema.safeParse({ ...base, fulfillment: "DELIVERY" }).success).toBe(false);
  });
  it("refuse quantités négatives, CGV non acceptées, e-mail invalide", () => {
    expect(checkoutSchema.safeParse({ ...base, lines: [{ productId: "p", quantity: -1 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, email: "pas-un-email" }).success).toBe(false);
  });
  it("ignore tout champ de prix envoyé par le navigateur", () => {
    const r = checkoutSchema.safeParse({ ...base, totalCents: 1, lines: [{ productId: "p1", quantity: 1, priceCents: 1 }] });
    expect(r.success).toBe(true);
    if (r.success) {
      expect("totalCents" in r.data).toBe(false);
      expect("priceCents" in r.data.lines[0]).toBe(false);
    }
  });
  it("valide une demande événementielle et bloque le champ piège", () => {
    const req = { fullName: "Léa Dupont", email: "lea@ex.fr", phone: "0601020304", eventType: "BIRTHDAY", description: "Anniversaire de 30 personnes", consent: true };
    expect(customRequestSchema.safeParse(req).success).toBe(true);
    expect(customRequestSchema.safeParse({ ...req, website: "spam" }).success).toBe(false);
    expect(customRequestSchema.safeParse({ ...req, eventDate: "2001-01-01" }).success).toBe(false);
  });
  it("impose un mot de passe robuste et identique", () => {
    const s = { firstName: "A", lastName: "B", email: "a@b.fr", password: "motdepasse1", confirmPassword: "motdepasse1", acceptTerms: true, marketingOptIn: false };
    expect(signUpSchema.safeParse(s).success).toBe(true);
    expect(signUpSchema.safeParse({ ...s, password: "court1", confirmPassword: "court1" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...s, confirmPassword: "autre12345" }).success).toBe(false);
  });
});

describe("fichiers déposés", () => {
  it("détecte le type réel par signature", () => {
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))?.mime).toBe("image/jpeg");
    expect(detectFileType(Buffer.from("%PDF-1.7 xxxxxxxx"))?.mime).toBe("application/pdf");
    expect(detectFileType(Buffer.from("<script>alert(1)</script>"))).toBeNull();
  });
  it("empêche toute sortie du dossier de stockage", () => {
    expect(safePath("products/../../etc/passwd")).toBeNull();
    expect(safePath("../secret")).toBeNull();
    expect(safePath("autre/fichier.jpg")).toBeNull();
    expect(safePath("products/abc-123.webp")).not.toBeNull();
  });
});

describe("e-mails", () => {
  it("échappe le HTML injecté par un client", () => {
    expect(escapeHtml('<img src=x onerror="x">')).toBe("&lt;img src=x onerror=&quot;x&quot;&gt;");
  });
});
