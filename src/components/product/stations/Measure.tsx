"use client";

import { useRef } from "react";
import { Station } from "../Station";
import { HudLabels, type HudLabel } from "@/components/home/HudLabels";
import { P0, P1, WEEKS, groupSizes, measure } from "@/components/gl/scenes/measure/measure";
import { AnchorDock } from "@/components/kit/AnchorDock";
import { RotaryKnob } from "@/components/kit/RotaryKnob";
import { ScrubTimeline } from "@/components/kit/ScrubTimeline";
import { count, rupees } from "@/lib/economics";
import { useAttract } from "@/lib/idle";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import styles from "./measure.module.css";

const avoidCopy = (x: number, y: number, w: number, h: number) => (w > 960 ? x < w * 0.4 : y < h * 0.4);

const LABELS: HudLabel[] = [
  { id: "m", anchor: "messaged", title: "Messaged", detail: "one dot per shopper", chapters: [0] },
  { id: "h", anchor: "holdout", title: "Holdout", detail: "never messaged", chapters: [0] },
];

const pp = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(2)} pp`;
const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

/** The 95 % band on a scale of percentage points, with the true gap and this world's measurement. */
function Band({ lo, hi, measuredGap }: { lo: number; hi: number; measuredGap: number }) {
  const min = -0.03;
  const max = 0.07;
  const at = (v: number) => `${((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100}%`;
  const truth = P1 - P0;
  const ticks = [-0.02, 0, 0.02, 0.04, 0.06];
  return (
    <div className={styles.band} role="img" aria-label={`95 percent range from ${pp(lo)} to ${pp(hi)}; measured ${pp(measuredGap)}`}>
      <div className={styles.scale}>
        {ticks.map((t) => (
          <span key={t} className={styles.tick} style={{ left: at(t) }} data-zero={t === 0 ? "1" : undefined}>
            <span className="t-hud">{t === 0 ? "0" : `${t > 0 ? "+" : "−"}${Math.abs(t * 100)}`}</span>
          </span>
        ))}
        <span className={styles.range} style={{ left: at(lo), width: `calc(${at(hi)} - ${at(lo)})` }} data-zero={lo <= 0 ? "1" : undefined} />
        <span className={styles.truth} style={{ left: at(truth) }} />
        <span className={styles.mark} style={{ left: at(measuredGap) }} />
      </div>
      <p className={`${styles.legend} t-hud`}>
        <span>
          <i className={styles.keyRange} /> 95 % range
        </span>
        <span>
          <i className={styles.keyMark} /> this world
        </span>
        <span>
          <i className={styles.keyTruth} /> true gap
        </span>
        <span>
          <i className={styles.keyDiff} /> large dots: orders above the holdout&rsquo;s rate
        </span>
      </p>
    </div>
  );
}

/**
 * Every world drawn at this holdout, as a dot on the same scale as the band. Draw a
 * few and the pile takes the shape of the range: the band is where most worlds land.
 */
function Worlds({ lo, hi }: { lo: number; hi: number }) {
  const worlds = useStore(measure, (s) => s.worlds);
  const min = -0.03;
  const max = 0.07;
  const bins = 34;
  const W = 460;
  const H = 92;
  const r = 3.6;
  const counts = new Array<number>(bins).fill(0);
  const dots: { x: number; y: number; k: number }[] = [];
  worlds.forEach((g, k) => {
    const b = Math.max(0, Math.min(bins - 1, Math.floor(((g - min) / (max - min)) * bins)));
    const n = counts[b]!++;
    dots.push({ x: ((b + 0.5) / bins) * W, y: H - 4 - n * (r * 2 + 1), k });
  });
  const at = (v: number) => ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * W;
  const inside = worlds.filter((g) => g >= lo && g <= hi).length;
  return (
    <figure className={styles.worlds}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMax meet" aria-hidden>
        <rect x={at(lo)} y={0} width={Math.max(0, at(hi) - at(lo))} height={H - 1} className={styles.worldsBand} />
        <line x1={at(0)} x2={at(0)} y1={0} y2={H} className={styles.worldsZero} />
        <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} className={styles.worldsBase} />
        {dots.map((d) =>
          d.y > 0 ? <circle key={d.k} cx={d.x} cy={d.y} r={r} className={styles.worldsDot} data-last={d.k === worlds.length - 1 ? "1" : undefined} /> : null,
        )}
      </svg>
      <figcaption className="t-hud">
        {worlds.length === 1 ? "1 world drawn" : `${worlds.length} worlds drawn`} at this holdout, {inside} inside the range
      </figcaption>
    </figure>
  );
}

function Hover() {
  const h = useStore(measure, (s) => s.hover);
  const week = useStore(measure, (s) => s.week);
  if (!h) return <p className={`${styles.hover} t-hud c-muted`}>Point at a dot: it is one shopper</p>;
  const ordered = h.week > 0 && h.week <= week;
  return (
    <p className={`${styles.hover} t-hud`}>
      Shopper {String(h.id + 1).padStart(4, "0")}, {h.group}, {ordered ? `ordered in week ${h.week}` : "no order yet"}
    </p>
  );
}

/**
 * P8, Measure: the split world. Two crowds as data dots, the messaged and the held
 * out, ordering week by week. The holdout knob moves shoppers between the crowds; the
 * band shows how sure the gap is, and it widens as the holdout shrinks. Resample to
 * draw a new world and watch the measurement move inside its range.
 */
export function Measure() {
  const area = useRef<HTMLDivElement>(null);
  const h = useStore(measure, (s) => s.holdoutPct);
  const week = useStore(measure, (s) => s.week);
  const p1 = useStore(measure, (s) => s.p1);
  const p0 = useStore(measure, (s) => s.p0);
  const { messaged, held, result } = groupSizes(h);

  useAttract(area, () => measure.set((s) => (s.week >= WEEKS ? { week: 1, seed: s.seed + 1 } : { week: s.week + 1 })), 1800);

  return (
    <Station
      id="measure"
      scene="measure"
      index="06"
      name="Measure"
      mark="Week 4"
      moment="The pilot review"
      title="Proof is the gap between two groups."
      height="280svh"
      lede={
        <p>
          A random share of shoppers, the holdout, never gets a message. The gap between the two crowds&rsquo; order rates is what the messages
          earned. Shrink the holdout and you message more people, but the gap gets harder to see.
        </p>
      }
    >
      <HudLabels labels={LABELS} chapter={0} scene="measure" avoid={avoidCopy} />
      <dl className={styles.rates} aria-live="polite">
        <div>
          <dt className="t-hud">Messaged</dt>
          <dd className="t-fig">{pct(p1)}</dd>
          <dd className="t-small c-muted">{count(messaged)} shoppers</dd>
        </div>
        <div>
          <dt className="t-hud">Holdout</dt>
          <dd className="t-fig">{pct(p0)}</dd>
          <dd className="t-small c-muted">{count(held)} shoppers</dd>
        </div>
        <div>
          <dt className="t-hud">Gap, this world</dt>
          <dd className="t-fig">{pp(p1 - p0)}</dd>
          <dd className="t-small c-muted">by week {week}</dd>
        </div>
      </dl>
      <p className={`${styles.hint} t-small`}>
        {result.lift.excludesZero ? `With a ${h} % holdout the range clears zero.` : `With a ${h} % holdout the range includes zero: the gap could be luck.`} Incremental revenue a month:{" "}
        {result.lift.measurable ? `${rupees(result.netRevenueLo + result.cost)} to ${rupees(result.netRevenueHi + result.cost)}` : "not measurable"}. From our illustrative business model, not a client result.
      </p>
      <Worlds lo={result.lift.lo} hi={result.lift.hi} />
      <Hover />
      {/* the valve between the crowds: turning it moves shoppers from one to the other */}
      <AnchorDock at="knob" scene="measure" center className={styles.valve} label="Holdout">
        <RotaryKnob label="Holdout" value={h} min={5} max={30} step={1} onChange={(v) => measure.set({ holdoutPct: v })} format={(v) => `${v} %`} hint={`${count(held)} held out`} size="m" />
      </AnchorDock>
      <AnchorDock at="bandL" to="bandR" scene="measure" className={styles.dock} label="The measurement">
        <div ref={area} className={styles.dockInner} data-avoid>
          <Band lo={result.lift.lo} hi={result.lift.hi} measuredGap={week === WEEKS ? p1 - p0 : ((p1 - p0) * WEEKS) / week} />
          <div className={styles.row}>
            <div className={styles.weeks}>
              <ScrubTimeline
                label="Weeks of the pilot"
                index={week - 1}
                onChange={(i) => measure.set({ week: i + 1 })}
                stops={Array.from({ length: WEEKS }, (_, i) => ({ id: `w${i + 1}`, label: `Week ${i + 1}` }))}
              />
            </div>
            <button
              type="button"
              className={styles.resample}
              onClick={() => {
                measure.set((s) => ({ seed: s.seed + 1, week: WEEKS }));
                sfx.relay();
              }}
            >
              Draw a new world
            </button>
          </div>
        </div>
      </AnchorDock>
    </Station>
  );
}
