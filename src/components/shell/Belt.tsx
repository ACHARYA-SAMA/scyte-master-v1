"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { haptic } from "@/lib/prefs";
import { TransitionLink } from "@/components/transition/navigation";
import styles from "./Belt.module.css";

const ITEMS = [
  { href: "/contact?intent=audit", label: "Book a store audit" },
  { href: "/contact?service=website", label: "Start a website" },
  { href: "/contact?service=apps", label: "Start an app" },
  { href: "/contact?service=social", label: "Start social media" },
  { href: "/product#pilot", label: "Run a recovery pilot" },
];

/** px/s the belt drifts at on its own, leftwards */
const CRUISE = -42;

/**
 * The ways in, on a belt. It drifts on its own, stops under the pointer so a link can
 * be clicked, and can be grabbed and thrown; after a throw it eases back to its drift.
 * Reduced motion: a still row that scrolls sideways.
 */
export function Belt() {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [still, setStill] = useState(false);
  const s = useRef({ x: 0, v: CRUISE, over: false, drag: false, id: -1, px: 0, pt: 0, moved: false, suppress: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      // a preference only the browser knows
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStill(true);
      return;
    }
    const st = s.current;
    let copy = 0;
    const measure = () => {
      copy = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!st.drag) {
        const want = st.over ? 0 : CRUISE;
        st.v += (want - st.v) * (1 - Math.exp(-dt * (st.over ? 6 : 1.4)));
        st.x += st.v * dt;
      }
      if (copy > 0) st.x = ((st.x % copy) - copy) % copy;
      const skew = Math.max(-8, Math.min(8, (st.v - CRUISE) / -160));
      el.style.transform = `translate3d(${st.x.toFixed(2)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
    };
  }, []);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (still || e.button !== 0) return;
    const st = s.current;
    st.id = e.pointerId;
    st.px = e.clientX;
    st.pt = performance.now();
    st.moved = false;
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const st = s.current;
    if (st.id !== e.pointerId) return;
    const dx = e.clientX - st.px;
    if (!st.moved && Math.abs(dx) < 6) return;
    if (!st.moved) {
      st.moved = true;
      st.drag = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const now = performance.now();
    const dt = Math.max(1, now - st.pt) / 1000;
    st.x += dx;
    st.v = st.v * 0.6 + (dx / dt) * 0.4;
    st.px = e.clientX;
    st.pt = now;
  };

  const up = (e: PointerEvent<HTMLDivElement>) => {
    const st = s.current;
    if (st.id !== e.pointerId) return;
    st.id = -1;
    if (!st.moved) return;
    st.drag = false;
    st.suppress = true;
    window.setTimeout(() => {
      st.suppress = false;
    }, 0);
    haptic(6);
  };

  const run = (hidden: boolean) => (
    <ul className={styles.run} aria-hidden={hidden || undefined} inert={hidden || undefined}>
      {ITEMS.map((it) => (
        <li key={it.href}>
          <TransitionLink href={it.href} className={styles.item} draggable={false} data-cursor="open">
            {it.label}
          </TransitionLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      ref={root}
      className={styles.belt}
      data-still={still ? "1" : undefined}
      data-cursor="drag"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") s.current.over = true;
      }}
      onPointerLeave={() => {
        s.current.over = false;
      }}
      onClickCapture={(e) => {
        if (s.current.suppress) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      <nav aria-label="Start something">
        <div ref={track} className={styles.track}>
          {run(false)}
          {still ? null : run(true)}
          {still ? null : run(true)}
        </div>
      </nav>
    </div>
  );
}
