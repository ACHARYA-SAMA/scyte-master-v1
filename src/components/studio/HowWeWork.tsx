"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sound";
import styles from "./HowWeWork.module.css";

/**
 * How a project runs, as a timeline you scrub. Weeks are typical ranges to confirm
 * with the studio before they are promised to anyone.
 */
const PHASES = [
  {
    name: "Discover",
    weeks: 1,
    span: "[CONFIRM: 1 week]",
    we: "Study your customers, your numbers and the three sites they compare you with.",
    you: "One call, access to analytics, the things you already know are broken.",
    get: "A one-page brief: who it is for, what it must do, how we will know it worked.",
  },
  {
    name: "Design",
    weeks: 2.5,
    span: "[CONFIRM: 2 to 3 weeks]",
    we: "Structure first, then type, colour and motion, shown on real devices.",
    you: "Two reviews. We bring options with reasons, not a gallery.",
    get: "A clickable design and a small design system your team can extend.",
  },
  {
    name: "Build",
    weeks: 4,
    span: "[CONFIRM: 3 to 6 weeks]",
    we: "Components, content, integrations, tests. A preview link from the first week.",
    you: "Content and approvals. Short check-ins, not long meetings.",
    get: "A fast, accessible build, measured on a budget Android phone.",
  },
  {
    name: "Launch",
    weeks: 1,
    span: "[CONFIRM: 1 week]",
    we: "Move the domain, set up search and analytics, watch the first days closely.",
    you: "A go-live time that suits your sales calendar.",
    get: "The site live, a handover call and the editor in your hands.",
  },
  {
    name: "Grow",
    weeks: 3,
    span: "Ongoing, optional",
    we: "Monthly fixes and improvements, picked by what the numbers say.",
    you: "A monthly review, if you want one.",
    get: "A site that gets better instead of older.",
  },
];

const TOTAL = PHASES.reduce((s, p) => s + p.weeks, 0);
const STARTS = PHASES.reduce<number[]>((a, p, i) => [...a, i === 0 ? 0 : a[i - 1] + PHASES[i - 1].weeks], []);

export function HowWeWork() {
  const [t, setT] = useState(0.1);
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const weeks = t * TOTAL;
  const index = Math.max(0, STARTS.findLastIndex((s) => weeks >= s));
  const phase = PHASES[index];
  const last = useRef(index);

  useEffect(() => {
    if (last.current !== index) {
      last.current = index;
      sfx.tick();
    }
  }, [index]);

  const at = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return;
    setT(Math.min(0.999, Math.max(0, (clientX - r.left) / r.width)));
  };

  return (
    <section className={styles.section} id="process" aria-labelledby="process-title">
      <header className={styles.head}>
        <p className="t-hud c-khaki">How we work</p>
        <h2 id="process-title" className={styles.title}>
          Five phases. Drag through them.
        </h2>
      </header>
      <div
        ref={track}
        className={styles.track}
        role="slider"
        tabIndex={0}
        aria-label="Project timeline"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(t * 100)}
        aria-valuetext={`${phase.name}, ${phase.span}`}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          at(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && at(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setT((v) => Math.min(0.999, v + 0.04));
          if (e.key === "ArrowLeft") setT((v) => Math.max(0, v - 0.04));
          if (e.key === "Home") setT(0);
          if (e.key === "End") setT(0.999);
        }}
        data-cursor="scrub"
      >
        {PHASES.map((p, i) => (
          <div key={p.name} className={styles.phase} style={{ flexGrow: p.weeks }} data-active={i === index ? "1" : undefined} data-past={i < index ? "1" : undefined}>
            <span className={styles.phaseName}>{p.name}</span>
            <span className={`${styles.phaseSpan} t-hud`}>{p.span}</span>
          </div>
        ))}
        <span className={styles.playhead} style={{ left: `${t * 100}%` }} aria-hidden>
          <i />
          <b className="t-hud">Week {Math.floor(weeks) + 1}</b>
        </span>
      </div>
      <div className={styles.detail} aria-live="polite">
        <div>
          <p className="t-hud c-muted">We</p>
          <p>{phase.we}</p>
        </div>
        <div>
          <p className="t-hud c-muted">You</p>
          <p>{phase.you}</p>
        </div>
        <div>
          <p className="t-hud c-muted">You get</p>
          <p>{phase.get}</p>
        </div>
      </div>
    </section>
  );
}
