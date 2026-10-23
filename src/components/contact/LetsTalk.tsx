"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion, springStep, SPRING } from "@/lib/motion";
import styles from "./LetsTalk.module.css";

const TEXT = "Let’s talk.";

/**
 * The headline as an instrument: each letter's weight and width follow the pointer,
 * on springs. With no pointer near (or on touch screens), a slow wave runs through
 * the letters instead, so the word is always speaking.
 */
export function LetsTalk({ as: Tag = "h1" }: { as?: "h1" | "p" }) {
  const root = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const letters = Array.from(el.querySelectorAll<HTMLElement>("[data-l]"));
    const s = letters.map(() => ({ w: 0, vw: 0, x: 0, vx: 0 }));
    let px = -9999;
    let py = -9999;
    const move = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
    };
    let last = performance.now();
    let idle = 1;
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const t = now / 1000;
      const rects = letters.map((l) => l.getBoundingClientRect());
      const nears = rects.map((r) => {
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        return Math.exp(-(d * d) / (2 * 180 * 180));
      });
      // the wave fades out as the pointer comes near, and back in when it leaves
      const pointing = Math.max(...nears) > 0.15 ? 1 : 0;
      idle += (1 - pointing - idle) * Math.min(1, dt * 2.5);
      letters.forEach((l, i) => {
        const wave = (Math.sin(t * 1.7 - i * 0.62) * 0.5 + 0.5) ** 2 * 0.75;
        const want = Math.max(nears[i], wave * idle);
        [s[i].w, s[i].vw] = springStep(s[i].w, s[i].vw, want, SPRING.float, dt);
        [s[i].x, s[i].vx] = springStep(s[i].x, s[i].vx, want, SPRING.dock, dt);
        l.style.fontWeight = String(Math.round(420 + s[i].w * 480));
        l.style.fontStretch = `${(66 + s[i].x * 46).toFixed(1)}%`;
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("pointermove", move);
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <Tag ref={root} className={styles.word} aria-label="Let’s talk." data-motion-own>
      {Array.from(TEXT).map((ch, i) =>
        ch === " " ? (
          <span key={i} className={styles.space} aria-hidden />
        ) : (
          <span key={i} data-l aria-hidden>
            {ch}
          </span>
        ),
      )}
    </Tag>
  );
}
