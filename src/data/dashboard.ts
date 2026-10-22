/**
 * SAMPLE DATA for the dashboard demo. Not a client, not a pilot, not a result.
 * Generated from a fixed seed so it renders the same every time. Shapes follow the
 * report's illustrative brand (section 13): about 2,000 orders and 5,000 abandoned
 * carts a month, a 10 % holdout.
 */

const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const r = rng(20261022);

export const FUNNEL = [
  { step: "Sessions", value: 48200 },
  { step: "Product views", value: 21900 },
  { step: "Carts", value: 7000 },
  { step: "Checkouts", value: 3300 },
  { step: "Payments", value: 2600 },
  { step: "Orders", value: 2000 },
];

export const FLOWS = [
  { flow: "Payment-failed rescue", sent: 412, delivered: 404, read: 361, clicked: 188, ordered: 61, optedOut: 2 },
  { flow: "COD confirmation", sent: 690, delivered: 681, read: 640, clicked: 597, ordered: 0, optedOut: 1 },
  { flow: "Checkout recovery", sent: 820, delivered: 801, read: 655, clicked: 201, ordered: 38, optedOut: 6 },
  { flow: "Cart recovery", sent: 980, delivered: 958, read: 712, clicked: 176, ordered: 29, optedOut: 9 },
];

/** Daily order rate (%) for messaged shoppers and the holdout over 30 days. */
export const DAILY = Array.from({ length: 30 }, (_, d) => {
  const messaged = 4 + (r() - 0.5) * 1.4 + Math.sin(d / 4) * 0.25;
  const holdout = 1.6 + (r() - 0.5) * 1.9;
  return { day: d + 1, messaged: +messaged.toFixed(2), holdout: +Math.max(0.2, holdout).toFixed(2) };
});

/** Cumulative incremental revenue with a 95 % band that narrows as data accrues. */
export const CUMULATIVE = (() => {
  let total = 0;
  return DAILY.map((p, i) => {
    total += (p.messaged - p.holdout) * 60 * 15; // 60 messaged shoppers a day × AOV-ish scale
    const half = 34000 / Math.sqrt(i + 1);
    return { day: p.day, value: Math.round(total), lo: Math.round(total - half * (i + 1) * 0.18), hi: Math.round(total + half * (i + 1) * 0.18) };
  });
})();

export const FAILURES = [
  { reason: "UPI timeout", count: 182, recovered: 0.41 },
  { reason: "Bank decline", count: 96, recovered: 0.27 },
  { reason: "Insufficient funds", count: 74, recovered: 0.19 },
  { reason: "User cancelled", count: 60, recovered: 0.12 },
];

export const COD = { confirmed: 0.86, rtoBefore: 0.22, rtoAfter: 0.15 };

export const HEALTH = {
  quality: "High" as "High" | "Medium" | "Low",
  limit: "Check the current tier in WhatsApp Manager",
  spend: 2610,
  optIns: 2140,
  optOuts: 18,
};
