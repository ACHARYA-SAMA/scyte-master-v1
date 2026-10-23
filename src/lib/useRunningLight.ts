"use client";

import { useEffect, type RefObject } from "react";
import { prefersReducedMotion } from "./motion";

/**
 * The machine running on its own: a light steps through a list's items, one every
 * `ms`, setting data-live on the current one and --run (the step's length) on the
 * list, so CSS can fill a bar in time. It waits while the list is off screen, the tab
 * is hidden, or a person is pointing at or focused inside it. Off with reduced motion.
 */
export const useRunningLight = (list: RefObject<HTMLElement | null>, ms: number) => {
  useEffect(() => {
    const el = list.current;
    if (!el || prefersReducedMotion()) return;
    const items = () => Array.from(el.children) as HTMLElement[];
    el.style.setProperty("--run", `${ms}ms`);
    let i = -1;
    let timer = 0;
    let visible = false;
    let held = false;
    const step = () => {
      const all = items();
      if (!all.length) return;
      all.forEach((it) => delete it.dataset.live);
      i = (i + 1) % all.length;
      // restart the CSS fill on the same element
      void all[i].offsetWidth;
      all[i].dataset.live = "1";
    };
    const run = () => {
      window.clearInterval(timer);
      if (!visible || held || document.hidden) return;
      step();
      timer = window.setInterval(step, ms);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting);
      run();
    });
    io.observe(el);
    const hold = () => {
      held = true;
      window.clearInterval(timer);
      items().forEach((it) => delete it.dataset.live);
    };
    const release = () => {
      held = false;
      run();
    };
    const onVisibility = () => run();
    el.addEventListener("pointerenter", hold);
    el.addEventListener("pointerleave", release);
    el.addEventListener("focusin", hold);
    el.addEventListener("focusout", release);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
      el.removeEventListener("pointerenter", hold);
      el.removeEventListener("pointerleave", release);
      el.removeEventListener("focusin", hold);
      el.removeEventListener("focusout", release);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [list, ms]);
};
