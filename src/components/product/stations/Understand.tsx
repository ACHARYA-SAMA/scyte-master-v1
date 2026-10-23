"use client";

import { useEffect, useId, useRef } from "react";
import { Station } from "../Station";
import { HudLabels, type HudLabel } from "@/components/home/HudLabels";
import { AARAV, SIGNALS, THRESHOLD, contributions, intent, score, type IntentInputs } from "@/lib/intent";
import { useStore } from "@/lib/store";
import { useAttract } from "@/lib/idle";
import { RotaryKnob } from "@/components/kit/RotaryKnob";
import { terrain } from "@/components/gl/scenes/understand/terrain";
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

function Knob({ k, label, max, step, unit, hint }: { k: "engagedSeconds" | "hoursSince"; label: string; max: number; step: number; unit: string; hint: string }) {
  const v = useStore(intent, (s) => s[k]);
  return <RotaryKnob label={label} value={v} min={0} max={max} step={step} onChange={(n) => intent.set({ [k]: n } as Partial<IntentInputs>)} format={(n) => `${n} ${unit}`} hint={hint} size="s" />;
}

/** Under the pointer: the score of the ground the pointer is over, read from the 3D terrain. */
function Probe() {
  const points = useStore(terrain, (s) => s.probe);
  return (
    <p className={`${styles.probe} t-hud`} aria-hidden>
      <span className="c-muted">Under the pointer</span>
      <span className="t-fig">{points === null ? "—" : `${Math.round(points)} pts`}</span>
    </p>
  );
}

/**
 * While the visitor is still, time passes on the terrain: Aarav goes quiet and his
 * score erodes, then a new signal (he comes back and starts checkout) lifts it again,
 * and the station settles back to Aarav at 1:30. Their own settings come back the
 * moment they move.
 */
const ERODE = [6, 12, 20, 30, 40, 48, 48, 0, 0, 0];

export function Understand() {
  const area = useRef<HTMLDivElement>(null);
  const saved = useRef<IntentInputs | null>(null);
  const attracting = useAttract(
    area,
    (n) => {
      if (!saved.current) saved.current = { ...intent.get() };
      const i = n % (ERODE.length + 2);
      if (i < ERODE.length) intent.set({ ...saved.current, hoursSince: ERODE[i]!, checkout: i >= 7 ? true : saved.current.checkout });
      else intent.set({ ...saved.current });
    },
    900,
  );
  // the visitor is back: their own settings return
  useEffect(() => {
    if (attracting || !saved.current) return;
    intent.set({ ...saved.current });
    saved.current = null;
  }, [attracting]);
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
      stage={<Probe />}
      lede={
        <p>
          Each signal raises a hill; together they lift the summit. Points fade when the shopper goes quiet. When the summit breaks the
          glass at 60, the shopper is worth a message. Not before.
        </p>
      }
    >
      <HudLabels labels={LABELS} chapter={0} scene="understand" avoid={avoidCopy} />
      <div className={styles.scoreRow}>
        <div className={styles.score} data-over={over ? "1" : undefined} aria-live="polite">
        <span className={`${styles.scoreValue} t-fig`}>{Math.round(total)}</span>
        <span className={styles.scoreText}>
          <span className="t-hud">Intent score, threshold {THRESHOLD}</span>
          <b>{over ? "Worth a message" : "Not yet. Wait and watch."}</b>
        </span>
        </div>
        <div className={styles.knobs} ref={area}>
        <Knob k="engagedSeconds" label="Engaged time" max={120} step={5} unit="s" hint="Counts over 30 s" />
        <Knob k="hoursSince" label="Quiet for" max={72} step={3} unit="h" hint="Halves in 24 h" />
        </div>
      </div>
      <div className={styles.toggles}>
        {SIGNALS.filter((s) => s.key !== "engaged").map((s) => (
          <Toggle key={s.key} k={s.key} label={s.label} points={s.points} />
        ))}
      </div>
      <p className={`${styles.hint} t-small`}>
        Example weights and threshold. Real ones are tuned per brand from pilot data. Engaged time adds {c.engaged} now.{" "}
        <button type="button" className={styles.link} onClick={() => intent.set({ ...AARAV })}>
          Back to Aarav at 1:30
        </button>
      </p>
    </Station>
  );
}
