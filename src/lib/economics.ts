/**
 * The illustrative unit economics from the business report, section 13, made
 * interactive and stricter in two ways the report flags itself:
 *   1. brands keep margin, not revenue, so there is a contribution-margin input;
 *   2. the holdout is taken out of the messageable pool, and its size sets how wide
 *      the uncertainty on the measured lift is.
 * With holdout = 0 and margin = 100 % this reproduces the report's case exactly.
 */

export type Inputs = {
  orders: number;
  aov: number;
  carts: number;
  messageablePct: number;
  messagesPerCart: number;
  messageCost: number;
  orderRatePct: number;
  incrementalPct: number;
  fee: number;
  marginPct: number;
  holdoutPct: number;
};

export const REPORT_CASE: Inputs = {
  orders: 2000,
  aov: 1500,
  carts: 5000,
  messageablePct: 40,
  messagesPerCart: 1.5,
  messageCost: 0.86,
  orderRatePct: 4,
  incrementalPct: 60,
  fee: 15000,
  /** Not in the report: a starting point for the slider. Every brand should set its own. */
  marginPct: 50,
  holdoutPct: 10,
};

export type Result = ReturnType<typeof model>;

export const model = (i: Inputs) => {
  const messageable = i.carts * (i.messageablePct / 100);
  const held = messageable * (i.holdoutPct / 100);
  const messaged = messageable - held;
  const messages = messaged * i.messagesPerCart;
  const messageSpend = messages * i.messageCost;
  const p1 = i.orderRatePct / 100;
  const p0 = p1 * (1 - i.incrementalPct / 100);
  const recovered = messaged * p1;
  const gross = recovered * i.aov;
  const incrementalOrders = messaged * (p1 - p0);
  const incRevenue = incrementalOrders * i.aov;
  const margin = i.marginPct / 100;
  const incContribution = incRevenue * margin;
  const cost = i.fee + messageSpend;
  const netMargin = incContribution - cost;
  const netRevenue = incRevenue - cost;

  // 95 % interval on the measured difference in order rates, messaged vs holdout.
  const n1 = Math.max(1, messaged);
  const n0 = Math.max(1, held);
  const se = held > 0 ? Math.sqrt((p1 * (1 - p1)) / n1 + (p0 * (1 - p0)) / n0) : Number.POSITIVE_INFINITY;
  const dLo = p1 - p0 - 1.96 * se;
  const dHi = p1 - p0 + 1.96 * se;
  const range = (d: number, m: number) => n1 * d * i.aov * m - cost;
  const netMarginLo = Number.isFinite(se) ? range(dLo, margin) : Number.NEGATIVE_INFINITY;
  const netMarginHi = Number.isFinite(se) ? range(dHi, margin) : Number.POSITIVE_INFINITY;
  const netRevenueLo = Number.isFinite(se) ? range(dLo, 1) : Number.NEGATIVE_INFINITY;
  const netRevenueHi = Number.isFinite(se) ? range(dHi, 1) : Number.POSITIVE_INFINITY;

  return {
    messageable,
    held,
    messaged,
    messages,
    messageSpend,
    recovered,
    gross,
    incrementalOrders,
    incRevenue,
    incContribution,
    cost,
    netMargin,
    netRevenue,
    multiple: cost > 0 ? incContribution / cost : 0,
    recoveredShareOfOrders: i.orders > 0 ? recovered / i.orders : 0,
    lift: { p1, p0, lo: dLo, hi: dHi, measurable: Number.isFinite(se), excludesZero: Number.isFinite(se) && dLo > 0 },
    netMarginLo,
    netMarginHi,
    netRevenueLo,
    netRevenueHi,
  };
};

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export const rupees = (n: number) => {
  if (!Number.isFinite(n)) return n > 0 ? "no upper bound" : "no lower bound";
  const s = inr.format(Math.round(Math.abs(n)));
  return `${n < 0 ? "−" : ""}₹${s}`;
};
export const count = (n: number) => inr.format(Math.round(n));
export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
