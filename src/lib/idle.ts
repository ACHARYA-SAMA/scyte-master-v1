"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createStore, useStore } from "./store";
import { prefersReducedMotion } from "./motion";

/**
 * One idle clock for the whole site. After IDLE_MS without input the visitor is
 * "still", and every visible set piece runs its attract mode; the next pointer move,
 * key, wheel, touch or scroll hands control straight back. Set pieces subscribe here
 * instead of each listening to input on their own.
 */
export const IDLE_MS = 3000;

export const idle = createStore({ still: false, since: 0 });

let started = false;
const start = () => {
  if (started || typeof window === "undefined") return;
  started = true;
  let timer = 0;
  const wake = () => {
    if (idle.get().still) idle.set({ still: false });
    window.clearTimeout(timer);
    timer = window.setTimeout(() => idle.set({ still: true, since: performance.now() }), IDLE_MS);
  };
  for (const e of ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const) {
    window.addEventListener(e, wake, { passive: true, capture: true });
  }
  wake();
};

/** Whether the visitor has stopped. Re-renders only when that flips. */
export const useStill = () => {
  useEffect(start, []);
  return useStore(idle, (s) => s.still);
};

/**
 * Attract mode for one set piece: while `area` is on screen and the visitor is still,
 * `step(n)` runs every `ms`. It stops the moment they move. Off with reduced motion.
 */
export const useAttract = (area: RefObject<HTMLElement | null>, step: (n: number) => void, ms: number) => {
  const still = useStill();
  const [visible, setVisible] = useState(false);
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [area]);

  useEffect(() => {
    if (!still || !visible || prefersReducedMotion()) return;
    let n = 0;
    stepRef.current(n++);
    const timer = window.setInterval(() => {
      if (!document.hidden) stepRef.current(n++);
    }, ms);
    return () => window.clearInterval(timer);
  }, [still, visible, ms]);

  return still && visible;
};

/** Whether an element is on screen, for pieces that pause their own loops off screen. */
export const useOnScreen = (area: RefObject<HTMLElement | null>, margin = "0px") => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(Boolean(e?.isIntersecting)), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [area, margin]);
  return on;
};
