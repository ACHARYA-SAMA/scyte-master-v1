"use client";

import { useCallback, useEffect, useId, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { gsap, prefersReducedMotion, springStep } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import styles from "./ScrubTimeline.module.css";

export type TimelineStop = { id: string; label: string; sub?: string };

type Props = {
  label: string;
  stops: readonly TimelineStop[];
  index: number;
  onChange: (i: number) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
};

const GLIDE = { stiffness: 140, damping: 18, mass: 1 };

/**
 * A route with stops and a drop of light that travels it. Drag the drop (it snaps to
 * the nearest stop when let go, ticking past each one), click a stop, or use the arrow
 * keys, Home and End. The line behind the drop draws itself as far as it has gone; the
 * drop stretches with its speed, the way liquid does.
 */
export function ScrubTimeline({ label, stops, index, onChange, orientation = "horizontal", className }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const n = Math.max(2, stops.length);
  const phys = useRef({ t: index / (n - 1), v: 0, dragging: false });
  const idx = useRef(index);
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
    idx.current = index;
  });

  const write = useCallback(() => {
    const p = phys.current;
    const el = root.current;
    if (!el) return;
    el.style.setProperty("--t", p.t.toFixed(4));
    el.style.setProperty("--stretch", Math.min(1.9, 1 + Math.abs(p.v) * 0.6).toFixed(3));
  }, []);

  // the glide loop: started by any change, it removes itself once the drop is at rest
  const loop = useRef<{ run: () => void } | null>(null);
  useEffect(() => {
    let alive = false;
    const tick = () => {
      const p = phys.current;
      if (p.dragging) return;
      const target = idx.current / (n - 1);
      const dt = gsap.ticker.deltaRatio(60) / 60;
      const next = springStep(p.t, p.v, target, GLIDE, dt);
      p.t = next[0];
      p.v = next[1];
      write();
      if (Math.abs(p.t - target) < 0.0006 && Math.abs(p.v) < 0.002) {
        p.t = target;
        p.v = 0;
        write();
        gsap.ticker.remove(tick);
        alive = false;
      }
    };
    loop.current = {
      run: () => {
        if (prefersReducedMotion()) {
          phys.current.t = idx.current / (n - 1);
          write();
          return;
        }
        if (alive) return;
        alive = true;
        gsap.ticker.add(tick);
      },
    };
    return () => {
      gsap.ticker.remove(tick);
      loop.current = null;
    };
  }, [n, write]);
  const run = useCallback(() => loop.current?.run(), []);

  useEffect(() => {
    run();
  }, [index, run]);
  useEffect(write, [write]);

  const go = (i: number) => {
    const next = Math.min(n - 1, Math.max(0, i));
    if (next !== idx.current) {
      idx.current = next;
      cb.current(next);
      sfx.detent();
    }
    run();
  };

  const at = (e: PointerEvent) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return 0;
    const f = orientation === "vertical" ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    return Math.min(1, Math.max(0, f));
  };

  const last = useRef({ t: 0, time: 0 });
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const p = phys.current;
    p.dragging = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    p.t = at(e);
    last.current = { t: p.t, time: performance.now() };
    write();
    go(Math.round(p.t * (n - 1)));
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = phys.current;
    if (!p.dragging) return;
    const t = at(e);
    const now = performance.now();
    p.v = ((t - last.current.t) / Math.max(1, now - last.current.time)) * 16;
    last.current = { t, time: now };
    p.t = t;
    write();
    const nearest = Math.round(t * (n - 1));
    if (nearest !== idx.current) go(nearest);
  };
  const onUp = () => {
    const p = phys.current;
    if (!p.dragging) return;
    p.dragging = false;
    run();
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (d !== undefined) {
      e.preventDefault();
      go(idx.current + d);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(0);
    } else if (e.key === "End") {
      e.preventDefault();
      go(n - 1);
    }
  };

  return (
    <div ref={root} className={`${styles.timeline} ${className ?? ""}`} data-orientation={orientation} style={{ "--n": n } as CSSProperties}>
      <div ref={track} className={styles.track} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} data-cursor="scrub">
        <span className={styles.rail} aria-hidden />
        <span className={styles.drawn} aria-hidden />
        <div
          className={styles.drop}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-describedby={`${id}-now`}
          aria-valuemin={1}
          aria-valuemax={n}
          aria-valuenow={index + 1}
          aria-valuetext={`${stops[index]?.label ?? ""}${stops[index]?.sub ? `, ${stops[index]?.sub}` : ""}`}
          onKeyDown={onKey}
        >
          <svg viewBox="-12 -12 24 24" aria-hidden>
            <circle r="10" className={styles.halo} />
            <circle r="5.5" className={styles.core} />
          </svg>
        </div>
      </div>
      <ol className={styles.stops}>
        {stops.map((s, i) => (
          <li key={s.id} style={{ "--at": i / (n - 1) } as CSSProperties} data-past={i <= index ? "1" : undefined} data-current={i === index ? "1" : undefined}>
            <button type="button" className={styles.stop} onClick={() => go(i)} tabIndex={-1}>
              <span className={styles.pin} aria-hidden />
              <span className={`${styles.stopLabel} t-hud`}>{s.label}</span>
              {s.sub ? <span className={`${styles.stopSub} t-small`}>{s.sub}</span> : null}
            </button>
          </li>
        ))}
      </ol>
      <span id={`${id}-now`} className="sr-only" aria-live="polite">
        {stops[index]?.label}
      </span>
    </div>
  );
}
