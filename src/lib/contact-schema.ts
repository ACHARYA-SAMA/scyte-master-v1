import { z } from "zod";

export const REVENUE_RANGES = [
  "Under ₹10 lakh a month",
  "₹10 lakh to ₹1 crore a month",
  "₹1 crore to ₹5 crore a month",
  "Over ₹5 crore a month",
  "Prefer not to say",
] as const;

export const PAINS = [
  "Abandoned carts",
  "Failed payments",
  "COD refusals and returns",
  "Can't tell what actually works",
  "Need a new website or app",
  "Social media",
  "Something else",
] as const;

export const INTENTS = ["audit", "project", "pilot"] as const;

export const SERVICE_IDS = ["recovery", "website", "apps", "social"] as const;

const url = z
  .string()
  .trim()
  .max(200)
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .refine((v) => !v || /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(v), "Enter a store address like yourstore.in");

/** Shared by the form (instant feedback) and the server action (the real check). */
export const contactSchema = z
  .object({
    intent: z.enum(INTENTS),
    service: z.enum(SERVICE_IDS).optional(),
    name: z.string().trim().min(2, "Your name, please").max(80),
    email: z.string().trim().email("An email we can reply to").max(120),
    store: url,
    revenue: z.enum(REVENUE_RANGES).optional(),
    pains: z.array(z.enum(PAINS)).max(PAINS.length).default([]),
    message: z.string().trim().max(2000).default(""),
    /** the reference printed on the visitor's receipt, so the email and the receipt match */
    ref: z.string().trim().max(24).optional(),
    /** Honeypot. Real people never see or fill this. */
    company: z.string().max(0).optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.intent === "audit" || v.intent === "pilot") && !v.store) {
      ctx.addIssue({ code: "custom", path: ["store"], message: v.intent === "pilot" ? "The pilot needs your store address" : "The audit needs your store address" });
    }
  });

/** The store address check, for the chat to reuse before it moves on. */
export const storeError = (v: string) => {
  const r = url.safeParse(v);
  return r.success ? null : (r.error.issues[0]?.message ?? "Enter a store address like yourstore.in");
};

export const emailError = (v: string) => (z.string().trim().email().safeParse(v).success ? null : "That does not look like an email yet. Try name@domain.com.");

export type ContactInput = z.input<typeof contactSchema>;
export type Contact = z.output<typeof contactSchema>;

export type ContactState =
  | { status: "idle" }
  | { status: "error"; message: string; fields: Partial<Record<keyof Contact, string>> }
  | { status: "sent"; intent: Contact["intent"]; name: string };
