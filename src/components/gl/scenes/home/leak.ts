"use client";

import { createStore } from "@/lib/store";

/**
 * The home page's shared state between the DOM chapters and the 3D scene.
 * Shares are equal on purpose: this is a simulation, not a measurement of any store.
 */
export const REASONS = [
  { code: "UPI_TIMEOUT", fix: "Retry link in one tap", note: "The UPI app never came back to the browser." },
  { code: "BANK_DECLINE", fix: "Switch to another UPI app or card", note: "The bank said no. The shopper still wants it." },
  { code: "INSUFFICIENT_FUNDS", fix: "Offer cash on delivery", note: "Not today, at this amount, on this method." },
  { code: "USER_CANCELLED", fix: "A reminder that the cart is saved", note: "They backed out of the payment sheet." },
] as const;

export type ReasonCode = (typeof REASONS)[number]["code"];

export const leak = createStore({
  /** which cracks are clamped, in REASONS order */
  sealed: [false, false, false, false] as boolean[],
  /** simulated drops counted since the page opened */
  arrived: 0,
  leaked: 0,
  rescued: 0,
  /** the crack the pointer or keyboard is pressing, and how far the hold has got */
  holding: -1,
  hold: 0,
  /** the glass scene has drawn under the hero, so the DOM logo can step aside */
  glass: false,
  /** the pressure valve: the share of payments that fail at the fork, 0..0.6 (a simulation setting) */
  failShare: 1 / 3,
  /** drops lost at each reason's crack, in REASONS order */
  leakedBy: [0, 0, 0, 0] as number[],
  /** when the release lever was last pulled (performance.now), for the surge */
  surge: 0,
  /** the finale's marquee: the ignition switch, and a counter bumped to light it again */
  ignition: true,
  ignite: 0,
});

export const sealCrack = (i: number) =>
  leak.set((s) => {
    if (s.sealed[i]) return {};
    const sealed = s.sealed.slice();
    sealed[i] = true;
    return { sealed };
  });

export const sealAll = () => leak.set({ sealed: [true, true, true, true] });

export const resetLeak = () =>
  leak.set({ sealed: [false, false, false, false], arrived: 0, leaked: 0, rescued: 0, holding: -1, hold: 0, failShare: 1 / 3, leakedBy: [0, 0, 0, 0], surge: 0 });

/** Chapter boundaries as fractions of the home section's scroll. Shared by DOM and 3D. */
export const HOME_CHAPTERS = {
  hero: [0, 0.06],
  flow: [0.06, 0.3],
  leaks: [0.3, 0.52],
  shopper: [0.52, 0.72],
  relit: [0.72, 0.86],
  studio: [0.86, 1],
} as const;
