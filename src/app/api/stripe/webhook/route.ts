import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/payments";

/** Webhook Stripe : la signature est vérifiée avant tout traitement. */
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return new Response("Paiement non configuré", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Signature manquante", { status: 400 });
  const body = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }
  try {
    const result = await handleStripeEvent(event);
    return Response.json({ received: true, result });
  } catch (e) {
    console.error("[stripe webhook] erreur de traitement", event.type, event.id, e instanceof Error ? e.message : e);
    // 500 → Stripe renverra l'événement plus tard
    return new Response("Erreur de traitement", { status: 500 });
  }
}
