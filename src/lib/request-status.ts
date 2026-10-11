import type { CustomRequestStatus } from "@/generated/prisma/enums";

export const REQUEST_STATUS_LABELS: Record<CustomRequestStatus, string> = {
  NEW: "Nouvelle demande",
  REVIEWING: "À l'étude",
  QUOTE_SENT: "Devis envoyé",
  ACCEPTED: "Acceptée",
  DECLINED: "Refusée",
  COMPLETED: "Terminée",
};
