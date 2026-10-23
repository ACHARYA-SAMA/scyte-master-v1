"use client";

import { useId } from "react";
import { Station } from "../Station";
import { HudLabels, type HudLabel } from "@/components/home/HudLabels";
import { groupSizes, measure } from "@/components/gl/scenes/measure/measure";
import { count, rupees } from "@/lib/economics";
import { useStore } from "@/lib/store";
import styles from "./stations.module.css";

const avoidCopy = (x: number, y: number, w: number, h: number) => (w > 960 ? x < Math.min(w * 0.44, 720) : y > h * 0.42);

const LABELS: HudLabel[] = [
  { id: "m", anchor: "messaged", title: "Messaged", detail: "measured order rate", chapters: [0] },
  { id: "h", anchor: "holdout", title: "Holdout", detail: "never messaged", chapters: [0] },
  { id: "d", anchor: "diff", title: "The difference", detail: "with its 95 % range", chapters: [0] },
];

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

export function Measure() {
  const id = useId();
  const h = useStore(measure, (s) => s.holdoutPct);
  const p1 = useStore(measure, (s) => s.p1);
  const p0 = useStore(measure, (s) => s.p0);
  const week = useStore(measure, (s) => s.week);
  const { messaged, held, result } = groupSizes(h);
  return (
    <Station
      id="measure"
      scene="measure"
      index="06"
      name="Measure"
      mark="Week 4"
      moment="The pilot review"
      title="Proof is the gap between two groups."
      height="300svh"
      lede={
        <p>
          A random share of shoppers, the holdout, never gets a message. Compare their order rate with everyone else’s: the gap is what
          the messages earned, and nothing else. Shrink the holdout and you message more people, but the gap gets harder to see.
        </p>
      }
    >
      <HudLabels labels={LABELS} chapter={0} scene="measure" avoid={avoidCopy} />
      <div className={styles.range}>
        <label htmlFor={id} className={styles.rangeLabel}>
          <span>Holdout, never messaged</span>
          <output htmlFor={id} className="t-fig">
            {h}%
          </output>
        </label>
        <input
          id={id}
          type="range"
          min={2}
          max={50}
          value={h}
          onChange={(e) => measure.set({ holdoutPct: Number(e.target.value) })}
          style={{ "--p": `${((h - 2) / 48) * 100}%` } as React.CSSProperties}
          data-cursor="drag"
        />
      </div>
      <dl className={styles.measures} aria-live="polite">
        <div>
          <dt className="t-hud">Messaged, this week</dt>
          <dd className="t-fig">{pct(p1)}</dd>
          <dd className="t-small c-muted">{count(messaged)} shoppers</dd>
        </div>
        <div>
          <dt className="t-hud">Holdout, this week</dt>
          <dd className="t-fig">{pct(p0)}</dd>
          <dd className="t-small c-muted">{count(held)} shoppers</dd>
        </div>
        <div className={styles.wideCell}>
          <dt className="t-hud">Incremental revenue a month, 95 % range</dt>
          <dd className="t-fig">
            {result.lift.measurable ? `${rupees(result.netRevenueLo + result.cost)} to ${rupees(result.netRevenueHi + result.cost)}` : "Not measurable"}
          </dd>
          <dd className="t-small c-muted">
            Point estimate {rupees(result.incRevenue)}. {result.lift.excludesZero ? "The lift is clear of zero." : "Too small a holdout to rule out zero."}
          </dd>
        </div>
      </dl>
      <p className={`${styles.hint} t-small`}>Simulation of week {week}, from our illustrative business model. Not a client result.</p>
    </Station>
  );
}
