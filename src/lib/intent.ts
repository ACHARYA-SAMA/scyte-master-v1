import { createStore } from "./store";

/**
 * The report's v1 intent score (section 7.3): a transparent points system with a
 * threshold, decaying over time. The weights and the threshold below are EXAMPLES for
 * the demo; real ones are tuned per brand from pilot data.
 */
export const SIGNALS = [
  { key: "engaged", label: "Engaged time over 30 s", points: 15 },
  { key: "sizeChart", label: "Size chart opened", points: 10 },
  { key: "reviews", label: "Reviews read", points: 10 },
  { key: "repeat", label: "Repeat view within 24 h", points: 15 },
  { key: "cart", label: "Added to cart", points: 20 },
  { key: "checkout", label: "Checkout started", points: 25 },
] as const;

export type SignalKey = (typeof SIGNALS)[number]["key"];

export const THRESHOLD = 60;
/** Score halves every this many hours without a new signal (example). */
export const HALF_LIFE_H = 24;

export type IntentInputs = {
  engagedSeconds: number;
  sizeChart: boolean;
  reviews: boolean;
  repeat: boolean;
  cart: boolean;
  checkout: boolean;
  hoursSince: number;
};

/** Aarav at 1:30: 38 engaged seconds, size chart, reviews, size M in the cart. */
export const AARAV: IntentInputs = { engagedSeconds: 38, sizeChart: true, reviews: true, repeat: false, cart: true, checkout: false, hoursSince: 0 };

export const intent = createStore({ ...AARAV });

export const contributions = (i: IntentInputs): Record<SignalKey, number> => ({
  engaged: i.engagedSeconds >= 30 ? 15 : 0,
  sizeChart: i.sizeChart ? 10 : 0,
  reviews: i.reviews ? 10 : 0,
  repeat: i.repeat ? 15 : 0,
  cart: i.cart ? 20 : 0,
  checkout: i.checkout ? 25 : 0,
});

export const decay = (hours: number) => Math.pow(0.5, hours / HALF_LIFE_H);

export const score = (i: IntentInputs) => {
  const c = contributions(i);
  const raw = Object.values(c).reduce((a, b) => a + b, 0);
  return raw * decay(i.hoursSince);
};
