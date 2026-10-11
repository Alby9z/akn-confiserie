import { beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/session";
import { createProduct } from "@/app/admin/_actions/products";
import { GET as exportOrders } from "@/app/admin/commandes/export/route";
import { GET as attachment } from "@/app/admin/demandes/[id]/piece-jointe/route";
import { PUT as putCart } from "@/app/api/cart/route";
import OrderDetail from "@/app/(shop)/compte/commandes/[id]/page";
import ConfirmationPage from "@/app/(shop)/commande/confirmation/page";
import { createPendingOrder } from "@/lib/orders";
import { customer, product, resetDb, setRequestHeaders, settings } from "../helpers";

const PASSWORD = "bonbons-2026";

async function registerVerified(email: string, role: "CUSTOMER" | "ADMIN" = "CUSTOMER") {
  await auth.api.signUpEmail({ body: { email, password: PASSWORD, name: "Test Client" } });
  await db.user.update({ where: { email }, data: { emailVerified: true, role } });
  return db.user.findUniqueOrThrow({ where: { email } });
}

async function login(email: string) {
  const res = await auth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true });
  expect(res.status).toBe(200);
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  setRequestHeaders({ cookie, origin: "http://localhost:3000" });
}

function expectNotFound(p: Promise<unknown>) {
  return expect(p).rejects.toMatchObject({ digest: expect.stringContaining("404") });
}

beforeEach(async () => {
  await resetDb();
  await settings();
  setRequestHeaders({});
});

describe("authentification", () => {
  it("exige la vérification de l'adresse e-mail avant connexion", async () => {
    await auth.api.signUpEmail({ body: { email: "nouvelle@example.test", password: PASSWORD, name: "N" } });
    const res = await auth.api.signInEmail({ body: { email: "nouvelle@example.test", password: PASSWORD }, asResponse: true });
    expect(res.status).toBe(403);
    expect(await db.emailLog.count({ where: { template: "verify_email" } })).toBeGreaterThanOrEqual(1);
  });

  it("stocke un mot de passe haché, jamais en clair", async () => {
    const u = await registerVerified("hash@example.test");
    const account = await db.account.findFirstOrThrow({ where: { userId: u.id } });
    expect(account.password).toBeTruthy();
    expect(account.password).not.toContain(PASSWORD);
  });

  it("renvoie la même erreur pour un e-mail inconnu ou un mauvais mot de passe", async () => {
    await registerVerified("connue@example.test");
    const wrongPwd = await auth.api.signInEmail({ body: { email: "connue@example.test", password: "mauvais-mdp-123" }, asResponse: true });
    const unknown = await auth.api.signInEmail({ body: { email: "inconnue@example.test", password: "mauvais-mdp-123" }, asResponse: true });
    expect(wrongPwd.status).toBe(unknown.status);
    expect((await wrongPwd.json()).code).toBe((await unknown.json()).code);
  });

  it("ne révèle pas qu'une adresse est déjà inscrite", async () => {
    await registerVerified("deja@example.test");
    await expect(auth.api.signUpEmail({ body: { email: "deja@example.test", password: PASSWORD, name: "Autre" } })).resolves.toBeTruthy();
    expect(await db.user.count({ where: { email: "deja@example.test" } })).toBe(1);
  });

  it("refuse un mot de passe trop court", async () => {
    await expect(auth.api.signUpEmail({ body: { email: "court@example.test", password: "abc12", name: "C" } })).rejects.toThrow();
  });

  it("ne laisse pas une cliente s'attribuer le rôle administrateur à l'inscription", async () => {
    await auth.api.signUpEmail({ body: { email: "pirate@example.test", password: PASSWORD, name: "P", role: "ADMIN" } as never }).catch(() => {});
    const u = await db.user.findUnique({ where: { email: "pirate@example.test" } });
    expect(u?.role ?? "CUSTOMER").toBe("CUSTOMER");
  });
});

describe("administration", () => {
  it("refuse les actions d'administration à une cliente", async () => {
    await registerVerified("cliente@example.test");
    await login("cliente@example.test");
    await expect(assertAdmin()).rejects.toThrow("FORBIDDEN");
    const fd = new FormData();
    fd.set("name", "Produit pirate");
    fd.set("price", "1,00");
    await expect(createProduct(fd)).rejects.toThrow("FORBIDDEN");
    expect(await db.product.count()).toBe(0);
  });

  it("refuse l'export et les pièces jointes sans rôle administrateur", async () => {
    const r = await db.customRequest.create({ data: { reference: "DEM-TEST01", fullName: "X", email: "x@x.fr", phone: "0601020304", eventType: "BIRTHDAY", description: "Test de demande", attachmentKey: "requests/x.pdf" } });
    expect((await exportOrders(new Request("http://localhost:3000/admin/commandes/export"))).status).toBe(404);
    await registerVerified("cliente2@example.test");
    await login("cliente2@example.test");
    expect((await exportOrders(new Request("http://localhost:3000/admin/commandes/export"))).status).toBe(404);
    expect((await attachment(new Request("http://localhost:3000"), { params: Promise.resolve({ id: r.id }) })).status).toBe(404);
  });

  it("autorise l'administratrice et neutralise les formules dans l'export CSV", async () => {
    await registerVerified("justine@example.test", "ADMIN");
    await login("justine@example.test");
    await expect(assertAdmin()).resolves.toMatchObject({ role: "ADMIN" });
    const p = await product();
    const order = await createPendingOrder({ lines: [{ productId: p.id, quantity: 1 }], fulfillment: "PICKUP", customer: { ...customer, lastName: "=HYPERLINK(\"http://x\")" } });
    if (!order.ok) throw new Error();
    await db.order.update({ where: { id: order.order.id }, data: { status: "PAID" } });
    const res = await exportOrders(new Request("http://localhost:3000/admin/commandes/export"));
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain("'=HYPERLINK");
    expect(await db.auditLog.count({ where: { action: "order.export" } })).toBe(1);
  });
});

describe("cloisonnement des données clientes", () => {
  it("une cliente ne peut pas consulter la commande d'une autre", async () => {
    const alice = await registerVerified("alice@example.test");
    await registerVerified("bob@example.test");
    const p = await product();
    const r = await createPendingOrder({ lines: [{ productId: p.id, quantity: 1 }], fulfillment: "PICKUP", customer, userId: alice.id });
    if (!r.ok) throw new Error();
    await login("bob@example.test");
    await expectNotFound(OrderDetail({ params: Promise.resolve({ id: r.order.id }) }));
    await expectNotFound(ConfirmationPage({ searchParams: Promise.resolve({ commande: r.order.id, cle: "jeton-invente" }) }));
    await login("alice@example.test");
    await expect(OrderDetail({ params: Promise.resolve({ id: r.order.id }) })).resolves.toBeTruthy();
  });

  it("le lien de confirmation invité fonctionne uniquement avec le bon jeton", async () => {
    const p = await product();
    const r = await createPendingOrder({ lines: [{ productId: p.id, quantity: 1 }], fulfillment: "PICKUP", customer });
    if (!r.ok) throw new Error();
    await expect(ConfirmationPage({ searchParams: Promise.resolve({ commande: r.order.id, cle: r.guestToken }) })).resolves.toBeTruthy();
    await expectNotFound(ConfirmationPage({ searchParams: Promise.resolve({ commande: r.order.id }) }));
  });

  it("l'API panier refuse les requêtes d'un autre site ou sans session", async () => {
    const body = JSON.stringify({ lines: [] });
    setRequestHeaders({});
    expect((await putCart(new Request("http://localhost:3000/api/cart", { method: "PUT", body, headers: { origin: "https://site-malveillant.example" } }))).status).toBe(403);
    expect((await putCart(new Request("http://localhost:3000/api/cart", { method: "PUT", body, headers: { origin: "http://localhost:3000" } }))).status).toBe(401);
  });
});
