import { z } from "zod";

/** Schémas partagés navigateur / serveur. Le serveur revalide toujours. */

const trimmed = (max: number) => z.string().trim().max(max);
const required = (label: string, max = 120) => z.string().trim().min(1, `${label} est obligatoire.`).max(max, `${label} est trop long.`);

export const emailSchema = z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(254);
export const frPhoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.-]/g, ""))
  .refine((v) => /^(?:\+33|0033|0)[1-9]\d{8}$/.test(v) || /^\+\d{8,15}$/.test(v), "Numéro de téléphone invalide.");
export const postalCodeSchema = z.string().trim().regex(/^\d{5}$/, "Code postal invalide (5 chiffres).");

export const passwordSchema = z
  .string()
  .min(10, "Le mot de passe doit contenir au moins 10 caractères.")
  .max(128, "Le mot de passe est trop long.")
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Le mot de passe doit contenir au moins une lettre et un chiffre.");

export const signUpSchema = z
  .object({
    firstName: required("Le prénom", 60),
    lastName: required("Le nom", 60),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { error: "Vous devez accepter les conditions pour créer un compte." }),
    marketingOptIn: z.boolean(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Les mots de passe ne correspondent pas." });

export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Le mot de passe est obligatoire.") });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Les mots de passe ne correspondent pas." });

export const cartLinesSchema = z
  .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(99) }))
  .max(100);

export const addressSchema = z.object({
  fullName: required("Le nom complet", 120),
  line1: required("L'adresse", 200),
  line2: trimmed(200).optional().or(z.literal("")),
  postalCode: postalCodeSchema,
  city: required("La ville", 100),
});

export const checkoutSchema = z
  .object({
    lines: cartLinesSchema.min(1, "Votre panier est vide."),
    couponCode: trimmed(40).optional().or(z.literal("")),
    fulfillment: z.enum(["PICKUP", "DELIVERY"]),
    email: emailSchema,
    firstName: required("Le prénom", 60),
    lastName: required("Le nom", 60),
    phone: frPhoneSchema,
    address: addressSchema.optional(),
    note: trimmed(500).optional().or(z.literal("")),
    acceptTerms: z.literal(true, { error: "Vous devez accepter les conditions générales de vente." }),
  })
  .refine((d) => d.fulfillment !== "DELIVERY" || d.address, { path: ["address"], message: "L'adresse de livraison est obligatoire." });

export const EVENT_TYPES = {
  BIRTHDAY: "Anniversaire",
  WEDDING: "Mariage",
  BAPTISM: "Baptême",
  FAMILY: "Événement familial",
  CORPORATE: "Événement professionnel",
  CELEBRATION: "Fête / célébration",
  BULK_ORDER: "Grosse commande",
  CUSTOM_BAGS: "Sachets personnalisés",
  CUSTOM_BOX: "Composition / coffret sur mesure",
  OTHER: "Autre demande",
} as const;

export type EventTypeKey = keyof typeof EVENT_TYPES;

export const customRequestSchema = z.object({
  fullName: required("Le nom et prénom", 120),
  email: emailSchema,
  phone: frPhoneSchema,
  eventType: z.enum(Object.keys(EVENT_TYPES) as [EventTypeKey, ...EventTypeKey[]], { error: "Choisissez un type de demande." }),
  eventDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Date invalide.")
    .refine((v) => !v || new Date(v) >= new Date(new Date().toDateString()), "La date ne peut pas être passée."),
  guestCount: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 100000), "Nombre de personnes invalide."),
  quantity: trimmed(200).optional().or(z.literal("")),
  budget: trimmed(100).optional().or(z.literal("")),
  preferences: trimmed(1000).optional().or(z.literal("")),
  description: z.string().trim().min(10, "Décrivez votre besoin en quelques mots (10 caractères minimum).").max(4000, "Description trop longue."),
  consent: z.literal(true, { error: "Votre accord est nécessaire pour traiter la demande." }),
  /** Champ piège anti-robots : doit rester vide */
  website: z.string().max(0).optional().or(z.literal("")),
});

export const REQUEST_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
