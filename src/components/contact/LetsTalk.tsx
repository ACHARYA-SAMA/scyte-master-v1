"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion, springStep, SPRING } from "@/lib/motion";
import styles from "./LetsTalk.module.css";

const TEXT = "Let’s talk.";

/**
 * The headline as an instrument: each letter's weight and width follow the pointer,
 * on springs. At rest it is set at one weight; nothing moves until you come near.
 */
export function LetsTalk({ as: Tag = "h1" }: { as?: "h1" | "p" }) {
  const root = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const letters = Array.from(el.querySelectorAll<HTMLElement>("[data-l]"));
    const s = letters.map(() => ({ w: 0, vw: 0, x: 0, vx: 0 }));
    let px = -9999;
    let py = -9999;
    const move = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
    };
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      letters.forEach((l, i) => {
        const r = l.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const near = Math.exp(-(d * d) / (2 * 180 * 180));
        [s[i].w, s[i].vw] = springStep(s[i].w, s[i].vw, near, SPRING.float, dt);
        [s[i].x, s[i].vx] = springStep(s[i].x, s[i].vx, near, SPRING.dock, dt);
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
    <Tag ref={root} className={styles.word} aria-label="Let’s talk.">
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
