"use client";

import { useEffect } from "react";
import { gsap, prefersReducedMotion, springStep, SPRING } from "@/lib/motion";

/**
 * Cards that answer the pointer: any [data-tilt] element leans towards it on springs
 * and a soft Lumen glare follows it across the surface (see .tilt in globals.css).
 * One listener for the whole site; only the card under the pointer, and one easing
 * back, are animated, and the ticker stops once they settle. Fine pointers only.
 */
const MAX = 6; // degrees

type Card = { el: HTMLElement; rx: number; vx: number; ry: number; vy: number; ga: number; vg: number; tx: number; ty: number; on: boolean };

export function Tilt() {
  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const cards = new Map<HTMLElement, Card>();
    let running = false;
    let last = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let busy = false;
      for (const c of cards.values()) {
        [c.rx, c.vx] = springStep(c.rx, c.vx, c.on ? c.tx : 0, SPRING.float, dt);
        [c.ry, c.vy] = springStep(c.ry, c.vy, c.on ? c.ty : 0, SPRING.float, dt);
        [c.ga, c.vg] = springStep(c.ga, c.vg, c.on ? 1 : 0, SPRING.dock, dt);
        c.el.style.setProperty("--rx", `${c.rx.toFixed(2)}deg`);
        c.el.style.setProperty("--ry", `${c.ry.toFixed(2)}deg`);
        c.el.style.setProperty("--ga", Math.max(0, c.ga).toFixed(3));
        const settled = !c.on && Math.abs(c.rx) < 0.02 && Math.abs(c.ry) < 0.02 && c.ga < 0.01;
        if (settled) {
          c.el.style.removeProperty("--rx");
          c.el.style.removeProperty("--ry");
          c.el.style.removeProperty("--ga");
          cards.delete(c.el);
        } else busy = true;
      }
      if (!busy) {
        running = false;
        gsap.ticker.remove(tick);
      }
    };
    const run = () => {
      if (running) return;
      running = true;
      last = performance.now();
      gsap.ticker.add(tick);
    };

    let current: HTMLElement | null = null;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (current && current !== el) {
        const c = cards.get(current);
        if (c) c.on = false;
      }
      current = el;
      if (!el) return run();
      const r = el.getBoundingClientRect();
      const u = (e.clientX - r.left) / r.width;
      const v = (e.clientY - r.top) / r.height;
      let c = cards.get(el);
      if (!c) {
        c = { el, rx: 0, vx: 0, ry: 0, vy: 0, ga: 0, vg: 0, tx: 0, ty: 0, on: true };
        cards.set(el, c);
      }
      c.on = true;
      c.tx = (0.5 - v) * MAX * 2;
      c.ty = (u - 0.5) * MAX * 2;
      el.style.setProperty("--gx", `${(u * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(v * 100).toFixed(1)}%`);
      run();
    };
    const onLeave = () => {
      if (current) {
        const c = cards.get(current);
        if (c) c.on = false;
      }
      current = null;
      run();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      gsap.ticker.remove(tick);
    };
  }, []);
  return null;
}
