"use client";

import { useEffect } from "react";
import { REASONS, leak, sealCrack } from "@/components/gl/scenes/home/leak";
import { ui, useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import styles from "./LeakControls.module.css";

const HOLD_MS = 850;

let active: { raf: number; i: number } | null = null;

const stopHold = () => {
  if (active) cancelAnimationFrame(active.raf);
  active = null;
  leak.set({ holding: -1, hold: 0 });
  ui.set({ hold: 0 });
};

/** A press-and-hold on crack i: fills over HOLD_MS, then clamps. */
const startHold = (i: number) => {
  if (leak.get().sealed[i] || active) return;
  haptic(8);
  const t0 = performance.now();
  const step = () => {
    const h = Math.min(1, (performance.now() - t0) / HOLD_MS);
    leak.set({ holding: i, hold: h });
    ui.set({ hold: h });
    if (h >= 1) {
      sealCrack(i);
      sfx.clamp();
      haptic([18, 30, 12]);
      stopHold();
      return;
    }
    if (active) active.raf = requestAnimationFrame(step);
  };
  active = { raf: requestAnimationFrame(step), i };
};

/**
 * The same four clamps as the 3D cracks, as press-and-hold buttons. Pointer, touch,
 * Space and Enter all work; the hold drives the cursor's progress bar and the 3D
 * crack's glow. Counters are the simulation's own, labelled as such.
 */
export function LeakControls() {
  const sealed = useStore(leak, (s) => s.sealed);
  const holding = useStore(leak, (s) => s.holding);
  const hold = useStore(leak, (s) => s.hold);
  const arrived = useStore(leak, (s) => s.arrived);
  const leaked = useStore(leak, (s) => s.leaked);
  const rescued = useStore(leak, (s) => s.rescued);
  useEffect(() => () => stopHold(), []);

  const count = sealed.filter(Boolean).length;

  return (
    <div className={styles.controls}>
      <ul className={styles.list}>
        {REASONS.map((r, i) => {
          const on = sealed[i];
          const progress = holding === i ? hold : on ? 1 : 0;
          return (
            <li key={r.code}>
              <button
                type="button"
                className={styles.crack}
                data-sealed={on ? "1" : undefined}
                aria-pressed={on}
                aria-label={on ? `${r.code} clamped with: ${r.fix}` : `Press and hold to clamp ${r.code} with: ${r.fix}`}
                disabled={on}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  startHold(i);
                }}
                onPointerUp={stopHold}
                onPointerCancel={stopHold}
                onPointerLeave={() => active?.i === i && stopHold()}
                onKeyDown={(e) => {
                  if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                    e.preventDefault();
                    startHold(i);
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === " " || e.key === "Enter") stopHold();
                }}
                data-cursor="hold"
                data-cursor-label="Hold to clamp"
              >
                <span className={styles.code}>{r.code}</span>
                <span className={styles.fix}>{r.fix}</span>
                <span className={`${styles.state} t-hud`}>{on ? "Clamped" : "Leaking"}</span>
                <span className={styles.bar} style={{ transform: `scaleX(${progress})` }} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      <div className={styles.counters} aria-live="polite">
        <p className={`${styles.note} t-hud`}>Simulation</p>
        <dl className={styles.stats}>
          <div>
            <dt className="t-hud">Orders</dt>
            <dd className="t-fig">{arrived}</dd>
          </div>
          <div>
            <dt className="t-hud">Leaked</dt>
            <dd className="t-fig">{leaked}</dd>
          </div>
          <div>
            <dt className="t-hud">Back via a fix</dt>
            <dd className="t-fig">{rescued}</dd>
          </div>
        </dl>
        <p className={`${styles.caption} t-small`}>
          One payment in three fails here so the leak is easy to see. {count === 4 ? "All four clamped." : `${count} of 4 clamped.`}
        </p>
      </div>
    </div>
  );
}
