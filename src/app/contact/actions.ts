"use server";

import { headers } from "next/headers";
import { contactSchema, type Contact, type ContactState } from "@/lib/contact-schema";
import { sendMail } from "@/lib/mail";

// A light per-instance rate limit. On Vercel each instance has its own memory, so
// this blunts bursts; put a shared store behind it if abuse ever shows up.
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const limited = (key: string) => {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
};

const format = (c: Contact) =>
  [
    `Intent: ${c.intent === "audit" ? "20-minute store audit" : "Studio project"}`,
    `Name: ${c.name}`,
    `Email: ${c.email}`,
    `Store: ${c.store || "not given"}`,
    `Monthly revenue: ${c.revenue ?? "not given"}`,
    `What hurts most: ${c.pains.length ? c.pains.join(", ") : "not given"}`,
    "",
    c.message || "(no message)",
  ].join("\n");

export async function submitContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const parsed = contactSchema.safeParse({
    intent: form.get("intent"),
    name: form.get("name"),
    email: form.get("email"),
    store: form.get("store") ?? "",
    revenue: form.get("revenue") || undefined,
    pains: form.getAll("pains"),
    message: form.get("message") ?? "",
    company: form.get("company") ?? "",
  });

  if (!parsed.success) {
    const fields: Partial<Record<keyof Contact, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof Contact | undefined;
      if (key && !fields[key]) fields[key] = issue.message;
    }
    // A filled honeypot gets a quiet success so bots learn nothing.
    if (fields.company) return { status: "sent", intent: "project", name: "" };
    return { status: "error", message: "A few fields need another look.", fields };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) {
    return { status: "error", message: "Too many messages from here in a short time. Email us directly instead.", fields: {} };
  }

  const c = parsed.data;
  try {
    await sendMail({
      replyTo: c.email,
      subject: `${c.intent === "audit" ? "Store audit" : "Studio project"}: ${c.name}${c.store ? ` (${c.store})` : ""}`,
      text: format(c),
    });
  } catch (err) {
    console.error("[contact] send failed", err);
    return {
      status: "error",
      message: "The message could not be sent just now. Email scytehq@gmail.com and we will pick it up.",
      fields: {},
    };
  }
  return { status: "sent", intent: c.intent, name: c.name.split(" ")[0] };
}
