"use client";

import { createStore } from "@/lib/store";

/**
 * The home film's timing, shared by the DOM titles and the 3D sets. Every value is a
 * fraction of the home section's scroll. The camera never stops moving forward: it
 * flies through the gate, down the pipe, out over the payment fork, falls with one drop
 * to Aarav's phone, rises to watch the cracks seal, and comes back out of the gate.
 */
export const SHOTS = {
  hero: [0, 0.06],
  approach: [0.06, 0.2],
  stream: [0.2, 0.36],
  leaks: [0.36, 0.52],
  shopper: [0.52, 0.72],
  relit: [0.72, 0.85],
  reveal: [0.85, 1],
} as const;

/** Hard cuts, each hidden inside a burst of light: through the gate, out of the pipe, back out of the gate. */
export const CUTS = [SHOTS.stream[0], SHOTS.leaks[0], SHOTS.reveal[0]] as const;

export type SetId = "gate" | "stream" | "fork";

export const setAt = (p: number): SetId => (p < CUTS[0] ? "gate" : p < CUTS[1] ? "stream" : p < CUTS[2] ? "fork" : "gate");

/** 0..1 burst of light around each cut: a quick swell into it, a longer fall after. */
export const flashAt = (p: number) => {
  let f = 0;
  for (const c of CUTS) {
    const d = p - c;
    const k = d < 0 ? 1 + d / 0.016 : 1 - d / 0.026;
    if (k > 0) f = Math.max(f, k * k * (3 - 2 * k));
  }
  return f;
};

/** Smoothstep of p from a to b. */
export const ramp = (p: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How far the cracks have been sealed: the playbooks clamp them as the camera rises. */
export const sealAt = (p: number) => ramp(p, 0.735, 0.8);

/** Development only: ?fx=bloom,shell,core,edges,dust,... switches parts of the film off, to find what a frame artifact comes from. */
export const devOff = (k: string) =>
  typeof window !== "undefined" && process.env.NODE_ENV !== "production" && (new URLSearchParams(window.location.search).get("fx") ?? "").split(",").includes(k);

export const film = createStore({
  /** the gate has drawn under the hero, so the DOM logo can hand over to it */
  glass: false,
});

/**
 * The camera's eased progress, which the titles follow so words and pictures move as
 * one. The scene writes it every frame it draws; `live` says whether it is drawing.
 * `intro` is the opening title sequence, 0..1, and `speed` how fast the camera flies.
 */
export const cine = { p: 0, live: false, intro: 0, speed: 0 };

/** Why payments fail at the fork, and the playbook that answers each. Shares are not modelled: this is a picture, not a measurement. */
export const REASONS = [
  { code: "UPI_TIMEOUT", fix: "Retry link in one tap", note: "The UPI app never came back" },
  { code: "BANK_DECLINE", fix: "Switch UPI app or card", note: "The bank said no" },
  { code: "INSUFFICIENT_FUNDS", fix: "Offer cash on delivery", note: "Not today, not this method" },
  { code: "USER_CANCELLED", fix: "Remind them the cart is saved", note: "Backed out of the sheet" },
] as const;

/** What Aarav did on the way in, in the order the tracking script records it. */
export const EVENTS = [
  { name: "product_view", detail: "engaged_time 38 s" },
  { name: "size_chart_open", detail: "review_scroll 80 %" },
  { name: "add_to_cart", detail: "variant M, ₹1,499" },
  { name: "checkout_started", detail: "consent_granted {whatsapp}" },
] as const;
