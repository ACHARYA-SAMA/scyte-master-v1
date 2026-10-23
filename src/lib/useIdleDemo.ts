"use client";

import { useEffect, useRef, type RefObject } from "react";
import { prefersReducedMotion } from "./motion";

/**
 * A control that shows how it works until someone uses it. While `area` is on screen
 * and nobody has touched it, `step` runs every `ms` (the first after `delay`). The
 * first press, key or wheel inside the area ends the demo for the visit, so it never
 * fights a person. Off with reduced motion.
 */
export const useIdleDemo = (area: RefObject<HTMLElement | null>, step: (n: number) => void, ms: number, delay = 1600) => {
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });

  useEffect(() => {
    const el = area.current;
    if (!el || prefersReducedMotion()) return;
    let visible = false;
    let done = false;
    let n = 0;
    let timer = 0;
    let first = 0;
    const tick = () => {
      if (done || !visible || document.hidden) return;
      stepRef.current(n++);
    };
    const start = () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      if (done || !visible) return;
      first = window.setTimeout(() => {
        tick();
        timer = window.setInterval(tick, ms);
      }, delay);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        visible = Boolean(e?.isIntersecting);
        start();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    const stop = () => {
      done = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
    el.addEventListener("pointerdown", stop);
    el.addEventListener("keydown", stop);
    el.addEventListener("wheel", stop, { passive: true });
    return () => {
      io.disconnect();
      stop();
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("keydown", stop);
      el.removeEventListener("wheel", stop);
    };
  }, [area, ms, delay]);
};
