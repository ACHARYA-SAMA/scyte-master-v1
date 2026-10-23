"use client";

import { useState } from "react";
import { SceneSection } from "@/components/gl/SceneSection";
import { builtAt, collapseAt } from "@/components/gl/scenes/assembly/AssemblyScene";
import { LAYERS } from "@/components/gl/scenes/assembly/layers";
import { HudLabels, type HudLabel } from "@/components/home/HudLabels";
import styles from "./Assembly.module.css";

const LABELS: HudLabel[] = LAYERS.map((l, i) => ({ id: l.id, anchor: `layer-${l.id}`, title: `${String(i + 1).padStart(2, "0")} ${l.name}`, chapters: [i] }));

const avoidCopy = (x: number, y: number, w: number, h: number) => (w > 960 ? x < Math.min(w * 0.42, 700) : y > h * 0.5);

/** One website, built in front of you: six layers, added in the order we add them. */
export function Assembly() {
  const [p, setP] = useState(0);
  const built = builtAt(p);
  const done = collapseAt(p) > 0.5;
  const current = Math.min(LAYERS.length - 1, Math.floor(built));
  return (
    <SceneSection scene="assembly" id="assembly" className={styles.section} onProgress={setP} aria-labelledby="assembly-title">
      <div className={styles.sticky}>
        <HudLabels labels={LABELS} chapter={done ? -1 : current} scene="assembly" avoid={avoidCopy} />
        <div className={styles.copy}>
          <p className="t-hud c-khaki">The assembly</p>
          <h2 id="assembly-title" className={styles.title}>
            {done ? "Finished. That is a website." : "One site, built in front of you."}
          </h2>
          <p className={styles.lede}>
            Every site we make goes through the same six layers, in this order. Scroll to add them. The demo store is fictional; the
            process is ours.
          </p>
          <ol className={styles.layers}>
            {LAYERS.map((l, i) => {
              const state = done || built >= i + 1 ? "done" : built > i ? "now" : "next";
              return (
                <li key={l.id} data-state={state}>
                  <span className={`${styles.n} t-hud`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.name}>{l.name}</span>
                  <span className={`${styles.note} t-small`}>{l.note}</span>
                </li>
              );
            })}
          </ol>
          <p className={`${styles.readout} t-hud`} aria-live="polite">
            {done ? "6 of 6 layers, live" : `Layer ${Math.min(6, Math.max(1, Math.ceil(built)))} of 6: ${LAYERS[current].name}`}
          </p>
        </div>
      </div>
    </SceneSection>
  );
}
