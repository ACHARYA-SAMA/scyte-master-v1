"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import styles from "./ThrowableCards.module.css";

type Card = { id: string; title: string; body: ReactNode };
type Body = { x: number; y: number; vx: number; vy: number; r: number; vr: number; held: boolean; w: number; h: number };

/**
 * Cards on a table you can pick up and throw. They slide on with momentum, spin a
 * little with the throw, bounce off the table's edges and settle with friction. The
 * arrow keys nudge the focused card; "Deal again" lays them back out. Every card is
 * a real, readable block of text in reading order.
 */
export function ThrowableCards({ cards, label, className }: { cards: readonly Card[]; label: string; className?: string }) {
  const table = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const bodies = useRef<Body[]>([]);
  const loop = useRef<(() => void) | null>(null);

  // deal: a loose fan across the table
  const deal = () => {
    const t = table.current;
    if (!t) return;
    const W = t.clientWidth;
    const H = t.clientHeight;
    bodies.current = cards.map((_, i) => {
      const el = els.current[i];
      const w = el?.offsetWidth ?? 260;
      const h = el?.offsetHeight ?? 180;
      // a loose grid: as many columns as fit, rows a card apart, each a little askew
      const cols = Math.min(cards.length, Math.max(1, Math.floor((W - 16) / (w + 24))));
      const rows = Math.ceil(cards.length / cols);
      const row = Math.floor(i / cols);
      const col = i % cols;
      const gapY = Math.max(8, (H - rows * h) / (rows + 1));
      return {
        x: Math.min(W - w - 8, Math.max(8, ((col + 0.5) / cols) * W - w / 2 + Math.sin(i * 7.3) * 14)),
        y: Math.min(H - h - 8, Math.max(8, gapY + row * (h + gapY) + Math.cos(i * 3.1) * 10)),
        vx: 0,
        vy: 0,
        r: Math.sin(i * 2.7) * 6,
        vr: 0,
        held: false,
        w,
        h,
      };
    });
    paint();
  };

  const paint = () => {
    bodies.current.forEach((b, i) => {
      const el = els.current[i];
      if (el) el.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0) rotate(${b.r.toFixed(2)}deg)`;
    });
  };

  useEffect(() => {
    deal();
    const onResize = () => deal();
    window.addEventListener("resize", onResize);
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const t = table.current;
      if (!t) return;
      const W = t.clientWidth;
      const H = t.clientHeight;
      let moving = false;
      for (const b of bodies.current) {
        if (b.held) {
          moving = true;
          continue;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.r += b.vr * dt;
        // the table's felt: momentum bleeds away
        const f = Math.exp(-dt * 3.2);
        b.vx *= f;
        b.vy *= f;
        b.vr *= Math.exp(-dt * 4);
        // the rails: bounce, losing a little each time
        if (b.x < 0) {
          b.x = 0;
          b.vx = Math.abs(b.vx) * 0.55;
          if (Math.abs(b.vx) > 60) sfx.tick();
        } else if (b.x > W - b.w) {
          b.x = W - b.w;
          b.vx = -Math.abs(b.vx) * 0.55;
          if (Math.abs(b.vx) > 60) sfx.tick();
        }
        if (b.y < 0) {
          b.y = 0;
          b.vy = Math.abs(b.vy) * 0.55;
        } else if (b.y > H - b.h) {
          b.y = H - b.h;
          b.vy = -Math.abs(b.vy) * 0.55;
        }
        if (Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vr) > 2) moving = true;
      }
      paint();
      if (!moving) {
        gsap.ticker.remove(tick);
        loop.current = null;
      }
    };
    loop.current = () => {
      last = performance.now();
      gsap.ticker.remove(tick);
      gsap.ticker.add(tick);
    };
    return () => {
      window.removeEventListener("resize", onResize);
      gsap.ticker.remove(tick);
    };
    // deal is stable in behaviour; the cards are fixed for the life of the table
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const raise = (i: number) => {
    els.current.forEach((el, k) => el && (el.style.zIndex = k === i ? "5" : el.style.zIndex === "5" ? "2" : el.style.zIndex || "1"));
  };

  const grab = (i: number) => (e: PointerEvent<HTMLElement>) => {
    const b = bodies.current[i];
    if (!b) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    raise(i);
    b.held = true;
    b.vx = b.vy = b.vr = 0;
    const ox = e.clientX - b.x;
    const oy = e.clientY - b.y;
    let px = e.clientX;
    let py = e.clientY;
    let pt = performance.now();
    const move = (ev: globalThis.PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(0.008, (now - pt) / 1000);
      // velocity, smoothed, so a flick throws and a slow drag places
      b.vx = b.vx * 0.5 + ((ev.clientX - px) / dt) * 0.5;
      b.vy = b.vy * 0.5 + ((ev.clientY - py) / dt) * 0.5;
      b.x = ev.clientX - ox;
      b.y = ev.clientY - oy;
      b.r += (b.vx * 0.004 - b.r * 0.1) * 0.5;
      px = ev.clientX;
      py = ev.clientY;
      pt = now;
      paint();
    };
    const up = () => {
      b.held = false;
      b.vr = b.vx * 0.04;
      if (prefersReducedMotion()) b.vx = b.vy = b.vr = 0;
      else if (Math.hypot(b.vx, b.vy) > 400) sfx.slice();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      loop.current?.();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    loop.current?.();
  };

  const nudge = (i: number) => (e: KeyboardEvent<HTMLElement>) => {
    const b = bodies.current[i];
    if (!b) return;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    raise(i);
    b.vx += d[0]! * 520;
    b.vy += d[1]! * 520;
    b.vr += d[0]! * 30;
    loop.current?.();
  };

  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      <div ref={table} className={styles.table} role="list" aria-label={label} data-motion-own>
        {cards.map((c, i) => (
          <article
            key={c.id}
            ref={(el) => void (els.current[i] = el)}
            role="listitem"
            className={styles.card}
            tabIndex={0}
            onPointerDown={grab(i)}
            onKeyDown={nudge(i)}
            data-cursor="drag"
            data-cursor-label="Throw"
            aria-label={`${c.title}. Use the arrow keys to slide it.`}
          >
            <span className={`${styles.n} t-hud`}>{String(i + 1).padStart(2, "0")}</span>
            <h3 className={styles.title}>{c.title}</h3>
            <p className={styles.body}>{c.body}</p>
          </article>
        ))}
      </div>
      <button type="button" className={styles.deal} onClick={deal}>
        Deal them again
      </button>
    </div>
  );
}
