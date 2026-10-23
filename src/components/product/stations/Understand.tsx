"use client";

import { useId } from "react";
import { Station } from "../Station";
import { HudLabels, type HudLabel } from "@/components/home/HudLabels";
import { AARAV, SIGNALS, THRESHOLD, contributions, intent, score, type IntentInputs } from "@/lib/intent";
import { useStore } from "@/lib/store";
import styles from "./stations.module.css";

const avoidCopy = (x: number, y: number, w: number, h: number) => (w > 960 ? x < Math.min(w * 0.44, 720) : y > h * 0.42);

const LABELS: HudLabel[] = [
  { id: "aarav", anchor: "aarav", title: "Aarav", detail: "intent score", chapters: [0] },
  ...SIGNALS.map((s) => ({ id: s.key, anchor: `sig-${s.key}`, title: s.label, detail: `+${s.points} points`, chapters: [0] })),
];

function Toggle({ k, label, points }: { k: keyof IntentInputs; label: string; points: number }) {
  const id = useId();
  const on = useStore(intent, (s) => Boolean(s[k]));
  return (
    <label htmlFor={id} className={styles.toggle} data-on={on ? "1" : undefined}>
      <input id={id} type="checkbox" checked={on} onChange={(e) => intent.set({ [k]: e.target.checked } as Partial<IntentInputs>)} />
      <span className={styles.switch} aria-hidden />
      <span className={styles.toggleLabel}>{label}</span>
      <span className={`${styles.points} t-hud`}>+{points}</span>
    </label>
  );
}

function Range({ k, label, min, max, unit }: { k: "engagedSeconds" | "hoursSince"; label: string; min: number; max: number; unit: string }) {
  const id = useId();
  const v = useStore(intent, (s) => s[k]);
  return (
    <div className={styles.range}>
      <label htmlFor={id} className={styles.rangeLabel}>
        <span>{label}</span>
        <output htmlFor={id} className="t-fig">
          {v} {unit}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={v}
        onChange={(e) => intent.set({ [k]: Number(e.target.value) } as Partial<IntentInputs>)}
        style={{ "--p": `${((v - min) / (max - min)) * 100}%` } as React.CSSProperties}
        data-cursor="drag"
      />
    </div>
  );
}

export function Understand() {
  const inputs = useStore(intent, (s) => s);
  const total = score(inputs);
  const c = contributions(inputs);
  const over = total >= THRESHOLD;
  return (
    <Station
      id="understand"
      scene="understand"
      index="03"
      name="Understand"
      mark="2:40"
      moment="Intent, scored in the open"
      title="Intent is a number you can read, not a guess."
      height="300svh"
      lede={
        <p>
          Each signal raises a hill; together they lift the summit. Points fade when the shopper goes quiet, and engaged time only counts
          on a visible tab with real scrolling. When the summit breaks the glass, the shopper is worth a message. Not before.
        </p>
      }
    >
      <HudLabels labels={LABELS} chapter={0} scene="understand" avoid={avoidCopy} />
      <div className={styles.score} data-over={over ? "1" : undefined} aria-live="polite">
        <span className={`${styles.scoreValue} t-fig`}>{Math.round(total)}</span>
        <span className={styles.scoreText}>
          <span className="t-hud">Intent score, threshold {THRESHOLD}</span>
          <b>{over ? "Worth a message" : "Not yet. Wait and watch."}</b>
        </span>
      </div>
      <Range k="engagedSeconds" label="Engaged time" min={0} max={120} unit="s" />
      <div className={styles.toggles}>
        {SIGNALS.filter((s) => s.key !== "engaged").map((s) => (
          <Toggle key={s.key} k={s.key} label={s.label} points={s.points} />
        ))}
      </div>
      <Range k="hoursSince" label="Quiet since the last signal" min={0} max={72} unit="h" />
      <p className={`${styles.hint} t-small`}>
        Example weights and threshold. Real ones are tuned per brand from pilot data. Engaged time adds {c.engaged} now.{" "}
        <button type="button" className={styles.link} onClick={() => intent.set({ ...AARAV })}>
          Back to Aarav at 1:30
        </button>
      </p>
    </Station>
  );
}
