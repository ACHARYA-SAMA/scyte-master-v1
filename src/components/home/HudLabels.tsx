"use client";

import { useEffect, useRef } from "react";
import { readAnchor } from "@/components/gl/anchors";
import { gl, ui, type SceneKey } from "@/lib/store";
import styles from "./HudLabels.module.css";

export type HudLabel = {
  id: string;
  anchor: string;
  title: string;
  detail?: string;
  /** chapter indexes the label shows in */
  chapters: number[];
  side?: "left" | "right";
};

/**
 * Leader-line labels pinned to points in the 3D scene. Positions come from the
 * scene's projected anchors, read once per frame; React renders the labels once.
 */
export function HudLabels({
  labels,
  chapter,
  avoid,
  scene = "home",
}: {
  labels: HudLabel[];
  chapter: number;
  /** the scene whose anchors these are */
  scene?: SceneKey;
  /** screen regions labels must stay out of, such as the copy column */
  avoid?: (x: number, y: number, w: number, h: number) => boolean;
}) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const live = gl.get().scene === scene && gl.get().visible && ui.get().webgl === "ready";
      labels.forEach((l, i) => {
        const el = refs.current[i];
        if (!el) return;
        const a = readAnchor(l.anchor);
        const clear = !a || !avoid || !avoid(a.x, a.y, window.innerWidth, window.innerHeight);
        const on = live && l.chapters.includes(chapter) && !!a?.onScreen && clear;
        // write only what changed: setting the same attribute every frame still
        // invalidates style for every label
        const flag = on ? "1" : "0";
        if (el.dataset.on !== flag) el.dataset.on = flag;
        if (a && on) {
          const t = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
          if (el.style.transform !== t) el.style.transform = t;
        }
      });
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [labels, chapter, avoid, scene]);

  return (
    <div className={styles.layer} aria-hidden>
      {labels.map((l, i) => (
        <div
          key={l.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={styles.label}
          data-side={l.side ?? "right"}
          data-on="0"
        >
          <span className={styles.dot} />
          <span className={styles.leader} />
          <span className={styles.text}>
            <span className="t-hud">{l.title}</span>
            {l.detail ? <span className={`${styles.detail} t-hud`}>{l.detail}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
