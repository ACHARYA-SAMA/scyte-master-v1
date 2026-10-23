"use client";

import { createStore } from "@/lib/store";
import { REPORT_CASE, model } from "@/lib/economics";

/**
 * The Measure station's state. The true rates come from the report's illustrative
 * case (4 % of messaged shoppers order; 60 % of those orders are incremental, so the
 * holdout orders at 1.6 %). Every "week" the simulation draws new samples for both
 * groups at their real sizes, so a small holdout visibly jumps around.
 */
export const P1 = REPORT_CASE.orderRatePct / 100;
export const P0 = P1 * (1 - REPORT_CASE.incrementalPct / 100);

export const measure = createStore({
  holdoutPct: REPORT_CASE.holdoutPct,
  /** this week's measured rates */
  p1: P1,
  p0: P0,
  week: 1,
});

export const groupSizes = (holdoutPct: number) => {
  const m = model({ ...REPORT_CASE, holdoutPct });
  return { messaged: Math.round(m.messaged), held: Math.round(m.held), result: m };
};

const gauss = () => {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Draw one week's measured order rates for both groups. */
export const sampleWeek = () => {
  const { messaged, held } = groupSizes(measure.get().holdoutPct);
  const p1 = Math.max(0, P1 + gauss() * Math.sqrt((P1 * (1 - P1)) / Math.max(1, messaged)));
  const p0 = Math.max(0, P0 + gauss() * Math.sqrt((P0 * (1 - P0)) / Math.max(1, held)));
  measure.set((s) => ({ p1, p0, week: s.week + 1 }));
};
