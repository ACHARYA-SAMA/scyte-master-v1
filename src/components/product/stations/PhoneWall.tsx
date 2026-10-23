"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { gsap, prefersReducedMotion, springStep } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import styles from "./phonewall.module.css";

export type WallItem = { id: string; name: string; when: string; render: (active: boolean, inFront: boolean) => ReactNode };

type Props = {
  items: WallItem[];
  focus: number;
  onFocus: (i: number) => void;
  label: string;
};

const STEP_DEG = 23;
const SNAP = { stiffness: 120, damping: 17, mass: 1 };

/**
 * Phones on a curved wall facing you, the way a control room's screens face the desk.
 * Drag the wall to turn it (it coasts and settles on the nearest phone), click a phone
 * to bring it round, or use the arrow keys and the two buttons. The phone in front
 * lifts towards you and is the only one you can use; the rest are inert until turned to.
 */
export function PhoneWall({ items, focus, onFocus, label }: Props) {
  const wall = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const pos = useRef({ x: focus, v: 0, dragging: false });
  const focusRef = useRef(focus);
  const [woken, setWoken] = useState<Set<number>>(() => new Set([focus]));

  useEffect(() => {
    focusRef.current = focus;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a phone stays awake once it has been turned to
    setWoken((w) => (w.has(focus) ? w : new Set(w).add(focus)));
  }, [focus]);

  // place every phone on the arc from the wall's continuous position
  useEffect(() => {
    const el = wall.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const place = () => {
      const pw = slots.current[0]?.offsetWidth ?? 300;
      const R = pw * 2.7;
      slots.current.forEach((s, i) => {
        if (!s) return;
        const d = i - pos.current.x;
        const a = (d * STEP_DEG * Math.PI) / 180;
        const x = R * Math.sin(a);
        const z = -R * (1 - Math.cos(a));
        const lift = Math.max(0, 1 - Math.abs(d) * 2) * 46;
        s.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, 0, ${(z + lift).toFixed(1)}px) rotateY(${(-d * STEP_DEG).toFixed(2)}deg)`;
        s.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
        s.style.setProperty("--dim", Math.min(1, Math.abs(d)).toFixed(3));
      });
    };
    const tick = (_t: number, deltaMs: number) => {
      const p = pos.current;
      if (!p.dragging) {
        const next = springStep(p.x, p.v, focusRef.current, SNAP, Math.min(0.05, deltaMs / 1000));
        p.x = reduced ? focusRef.current : next[0];
        p.v = reduced ? 0 : next[1];
      }
      place();
    };
    place();
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      gsap.ticker.remove(tick);
    };
  }, []);

  const go = (i: number) => {
    const n = Math.max(0, Math.min(items.length - 1, i));
    if (n !== focusRef.current) {
      sfx.detent();
      haptic(6);
      onFocus(n);
    }
  };

  // drag to turn the wall
  const drag = useRef<{ x: number; start: number; last: number; t: number; moved: boolean } | null>(null);
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    // the phone in front keeps its own gestures
    if ((e.target as Element).closest("[data-front='1']")) return;
    drag.current = { x: e.clientX, start: pos.current.x, last: e.clientX, t: performance.now(), moved: false };
    pos.current.dragging = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const pw = slots.current[0]?.offsetWidth ?? 300;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    const now = performance.now();
    pos.current.v = (-(e.clientX - d.last) / pw) * (1000 / Math.max(8, now - d.t)) * 0.9;
    d.last = e.clientX;
    d.t = now;
    pos.current.x = Math.max(-0.4, Math.min(items.length - 0.6, d.start - dx / (pw * 0.95)));
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    pos.current.dragging = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d) return;
    if (!d.moved) {
      // a click on a phone that is not in front brings it round
      const slot = (e.target as Element).closest<HTMLElement>("[data-slot]");
      if (slot) go(Number(slot.dataset.slot));
      return;
    }
    // coast a little, then settle on the nearest phone
    go(Math.round(pos.current.x + pos.current.v * 0.25));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(focusRef.current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(focusRef.current - 1);
    }
  };

  return (
    <div className={styles.wrap}>
      <div
        ref={wall}
        className={styles.wall}
        role="group"
        aria-label={label}
        aria-roledescription="carousel"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
        data-cursor="drag"
        data-cursor-label="Turn"
      >
        {items.map((it, i) => (
          <div
            key={it.id}
            ref={(el) => {
              slots.current[i] = el;
            }}
            className={styles.slot}
            data-slot={i}
            data-front={i === focus ? "1" : undefined}
            inert={i !== focus}
            aria-label={`${i + 1} of ${items.length}: ${it.name}`}
            style={{ "--dim": Math.min(1, Math.abs(i - focus)) } as CSSProperties}
          >
            <p className={styles.tag}>
              <span className="t-hud">{it.name}</span>
              <span className="t-hud c-muted">{it.when}</span>
            </p>
            {it.render(woken.has(i), i === focus)}
          </div>
        ))}
      </div>
      <div className={styles.controls}>
        <button type="button" className={styles.arrow} onClick={() => go(focus - 1)} disabled={focus === 0} aria-label="Previous phone">
          <span aria-hidden>←</span>
        </button>
        <ol className={styles.dots}>
          {items.map((it, i) => (
            <li key={it.id}>
              <button type="button" className={styles.dot} onClick={() => go(i)} aria-current={i === focus ? "true" : undefined} aria-label={it.name} />
            </li>
          ))}
        </ol>
        <span className={`${styles.current} t-hud`} aria-live="polite">
          {String(focus + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")} {items[focus]?.name}
        </span>
        <button type="button" className={styles.arrow} onClick={() => go(focus + 1)} disabled={focus === items.length - 1} aria-label="Next phone">
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
