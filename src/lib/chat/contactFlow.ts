import { PAINS, REVENUE_RANGES, emailError, storeError } from "@/lib/contact-schema";
import type { Flow } from "./types";

/**
 * Talking to Scyte, the way a store's customers would talk to the store. Every answer
 * fills a field of the real form under the phone, which is what gets sent.
 */
export const CONTACT_FLOW: Flow = {
  id: "contact",
  business: "Scyte",
  notification: "Scyte: hi. Five quick questions and a person reads every answer.",
  start: "need",
  router: [{ match: /\b(stop|cancel)\b/i, to: "pause" }],
  fallback: "need",
  nodes: {
    need: {
      id: "need",
      bot: [{ kind: "text", text: "Hi, this is Scyte. Five quick questions, and a person reads every answer. What do you need?" }],
      replies: [
        { label: "A store audit", to: "store", fields: [{ name: "intent", value: "audit" }, { name: "service", value: "recovery" }] },
        { label: "A WhatsApp recovery pilot", to: "store", fields: [{ name: "intent", value: "pilot" }, { name: "service", value: "recovery" }] },
        { label: "A website", to: "store", fields: [{ name: "intent", value: "project" }, { name: "service", value: "website" }] },
        { label: "A mobile app", to: "store", fields: [{ name: "intent", value: "project" }, { name: "service", value: "apps" }] },
        { label: "Social media", to: "store", fields: [{ name: "intent", value: "project" }, { name: "service", value: "social" }] },
      ],
    },
    store: {
      id: "store",
      bot: [{ kind: "text", text: "Good. What's the store or brand's web address? A link is enough." }],
      input: { placeholder: "yourstore.in", to: "revenue", field: "store", type: "url", validate: storeError },
      replies: [{ label: "We don't have one yet", to: "revenue", field: { name: "store", value: "" } }],
    },
    revenue: {
      id: "revenue",
      bot: [{ kind: "text", text: "Roughly what does it sell in a month? Only so we size the work right." }],
      replies: REVENUE_RANGES.map((r) => ({ label: r, to: "pain", field: { name: "revenue", value: r } })),
    },
    pain: {
      id: "pain",
      bot: [{ kind: "text", text: "What hurts most right now?" }],
      replies: PAINS.map((p) => ({ label: p, to: "name", field: { name: "pains", value: p } })),
    },
    name: {
      id: "name",
      bot: [{ kind: "text", text: "Noted. And your name?" }],
      input: { placeholder: "Your name", to: "email", field: "name", validate: (t) => (t.trim().length < 2 ? "A name with at least two letters, please." : null) },
    },
    email: {
      id: "email",
      bot: [{ kind: "text", text: "Where should we reply? An email works best." }],
      input: { placeholder: "name@yourstore.in", to: "note", field: "email", type: "email", validate: emailError },
    },
    note: {
      id: "note",
      bot: [{ kind: "text", text: "Anything else we should know before we look? Type it, or skip." }],
      input: { placeholder: "Optional", to: "confirm", field: "message" },
      replies: [{ label: "Nothing else", to: "confirm" }],
    },
    confirm: {
      id: "confirm",
      bot: [
        {
          kind: "text",
          text: "That's everything. The form under this phone now holds your answers. Check it, then send.",
          actions: [{ label: "Send it", to: "sending", tone: "primary" }],
        },
      ],
    },
    sending: { id: "sending", bot: [{ kind: "text", text: "Sending…" }], outcome: "sent" },
    pause: { id: "pause", bot: [{ kind: "text", text: "No problem. Nothing has been sent. The form below keeps what you typed." }], end: true },
  },
};

export type ContactLang = "en" | "hi" | "te" | "hinglish";
export type ContactIntent = "audit" | "project" | "pilot";

/** The greeting, in the visitor's language. The rest of the chat is in English for now. */
const GREETING: Record<ContactLang, string> = {
  en: "Hi, this is Scyte. Five quick questions, and a person reads every answer.",
  hi: "नमस्ते, यह Scyte है। पाँच छोटे सवाल, और हर जवाब एक इंसान पढ़ता है।",
  te: "నమస్తే, ఇది Scyte. ఐదు చిన్న ప్రశ్నలు, ప్రతి సమాధానాన్ని ఒక మనిషి చదువుతారు.",
  hinglish: "Hi, yeh Scyte hai. Paanch chhote sawaal, aur har jawaab ek insaan padhta hai.",
};

const OPENER: Record<ContactIntent, string> = {
  audit: "You picked the 20-minute store audit.",
  project: "You picked a studio project.",
  pilot: "You picked a 30-day pilot.",
};

const FIELDS: Record<ContactIntent, { name: string; value: string }[]> = {
  audit: [
    { name: "intent", value: "audit" },
    { name: "service", value: "recovery" },
  ],
  project: [{ name: "intent", value: "project" }],
  pilot: [
    { name: "intent", value: "pilot" },
    { name: "service", value: "recovery" },
  ],
};

/**
 * The same conversation, opened for the intent a visitor picked and greeted in their
 * language. With an intent picked, the first question is skipped: the chat goes
 * straight to the store, and the form already knows what is wanted.
 */
export const contactFlow = (intent: ContactIntent | null, lang: ContactLang): Flow => {
  const greeting = GREETING[lang];
  if (!intent || intent === "project") {
    return {
      ...CONTACT_FLOW,
      id: `contact-${intent ?? "any"}-${lang}`,
      nodes: {
        ...CONTACT_FLOW.nodes,
        need: { ...CONTACT_FLOW.nodes.need!, bot: [{ kind: "text", text: `${greeting} ${intent === "project" ? "Which kind of project?" : "What do you need?"}` }] },
      },
    };
  }
  return {
    ...CONTACT_FLOW,
    id: `contact-${intent}-${lang}`,
    start: "opened",
    nodes: {
      ...CONTACT_FLOW.nodes,
      opened: {
        id: "opened",
        bot: [{ kind: "text", text: `${greeting} ${OPENER[intent]}` }],
        replies: [
          { label: "That's right", to: "store", fields: FIELDS[intent] },
          { label: "Something else", to: "need" },
        ],
      },
    },
  };
};
