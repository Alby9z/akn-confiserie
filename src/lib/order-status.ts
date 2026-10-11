import type { OrderStatus } from "@/generated/prisma/enums";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "En attente de paiement",
  PAID: "Payée",
  PREPARING: "En préparation",
  READY_FOR_PICKUP: "Prête au retrait",
  SHIPPED: "Expédiée",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  REFUNDED: "Remboursée",
};

/**
 * Transitions qu'une administratrice peut déclencher manuellement.
 * PENDING_PAYMENT → PAID et → REFUNDED sont réservées au traitement des paiements Stripe.
 */
const MANUAL_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAID: ["PREPARING", "READY_FOR_PICKUP", "SHIPPED"],
  PREPARING: ["READY_FOR_PICKUP", "SHIPPED"],
  READY_FOR_PICKUP: ["COMPLETED"],
  SHIPPED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export function allowedManualTransitions(from: OrderStatus, fulfillment: "PICKUP" | "DELIVERY"): OrderStatus[] {
  return MANUAL_TRANSITIONS[from].filter((to) => {
    if (to === "READY_FOR_PICKUP") return fulfillment === "PICKUP";
    if (to === "SHIPPED") return fulfillment === "DELIVERY";
    return true;
  });
}

export function canTransition(from: OrderStatus, to: OrderStatus, fulfillment: "PICKUP" | "DELIVERY"): boolean {
  return allowedManualTransitions(from, fulfillment).includes(to);
}

/** Statuts pour lesquels un paiement a été confirmé par Stripe */
export const PAID_STATUSES: OrderStatus[] = ["PAID", "PREPARING", "READY_FOR_PICKUP", "SHIPPED", "COMPLETED"];
