"use client";

import { createStore } from "@/lib/store";
import { REPORT_CASE, model } from "@/lib/economics";

/**
 * The Measure station's state. The true rates come from the report's illustrative
 * case: 4 % of messaged shoppers order; 60 % of those orders are incremental, so the
 * holdout orders at 1.6 %. Every shopper in the scene is one dot with a fixed random
 * draw; which group it is in decides its chance of ordering, so moving the holdout
 * moves real dots between two real crowds, and a resample redraws the world.
 */
export const P1 = REPORT_CASE.orderRatePct / 100;
export const P0 = P1 * (1 - REPORT_CASE.incrementalPct / 100);
export const SHOPPERS = 2000;
export const WEEKS = 4;

export const measure = createStore({
  holdoutPct: REPORT_CASE.holdoutPct,
  /** how far through the four weeks the scene is showing, 1..4 */
  week: WEEKS,
  /** bumped to redraw every shopper's luck */
  seed: 1,
  /** the dot under the pointer, if any */
  hover: null as null | { id: number; group: "messaged" | "holdout"; week: number },
  /** this world's measured rates at the week shown */
  p1: P1,
  p0: P0,
  /** the four-week gap each world drawn at this holdout measured: a sampling distribution, built by hand */
  worlds: [] as number[],
});

export const groupSizes = (holdoutPct: number) => {
  const m = model({ ...REPORT_CASE, holdoutPct });
  return { messaged: Math.round(m.messaged), held: Math.round(m.held), result: m };
};

/** A small fast PRNG, so a seed always draws the same world. */
const mulberry = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Each shopper's draw, 0..1, for one seed. */
export const draws = (seed: number) => {
  const r = mulberry(seed * 9973 + 17);
  return Float32Array.from({ length: SHOPPERS }, () => r());
};

/**
 * Who is in which group and when each ordered (0 = did not). The holdout is the last
 * `held` shoppers, so turning the knob moves shoppers from one crowd to the other.
 */
export const outcomes = (d: Float32Array, holdoutPct: number) => {
  const { held } = groupSizes(holdoutPct);
  const n1 = SHOPPERS - held;
  const week = new Uint8Array(SHOPPERS);
  for (let i = 0; i < SHOPPERS; i++) {
    const rate = i < n1 ? P1 : P0;
    const r = d[i]!;
    week[i] = r < rate ? 1 + Math.min(WEEKS - 1, Math.floor((r / rate) * WEEKS)) : 0;
  }
  return { n1, n0: held, week };
};

/** The rates this world measured by a given week. */
export const measured = (o: ReturnType<typeof outcomes>, upTo: number) => {
  let m = 0;
  let h = 0;
  for (let i = 0; i < SHOPPERS; i++) {
    const w = o.week[i]!;
    if (!w || w > upTo) continue;
    if (i < o.n1) m++;
    else h++;
  }
  return { p1: o.n1 ? m / o.n1 : 0, p0: o.n0 ? h / o.n0 : 0, m, h };
};
