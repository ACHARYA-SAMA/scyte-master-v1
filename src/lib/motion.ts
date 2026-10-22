"use client";

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";

/**
 * The motion system. One place for easings, durations and stagger rules; CSS mirrors
 * the same curves as custom properties in globals.css.
 */

export const EASE = {
  /** The snap. Target locks, menu cells, slice strips. */
  latch: "0.62, 0, 0.06, 1",
  /** Entrances and dwell-to-glide camera moves. */
  glide: "0.2, 0.84, 0.16, 1",
  /** Exits accelerate away. */
  cut: "0.6, 0, 0.84, 0.24",
  /** Long scroll-linked in-outs. */
  drift: "0.38, 0, 0.22, 1",
} as const;

export const DUR = {
  feedback: 0.12,
  ui: 0.28,
  hud: 0.6,
  route: 0.9,
} as const;

export const STAGGER = {
  cell: 0.018,
  line: 0.04,
  panel: 0.07,
} as const;

/** Spring configs for Motion (framer) components. */
export const SPRING = {
  latch: { type: "spring", stiffness: 520, damping: 34, mass: 0.6 },
  dock: { type: "spring", stiffness: 210, damping: 22, mass: 0.9 },
} as const;

let registered = false;

export const registerMotion = () => {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(CustomEase, ScrollTrigger, SplitText, ScrambleTextPlugin, useGSAP);
  for (const [name, curve] of Object.entries(EASE)) CustomEase.create(name, curve);
  gsap.defaults({ ease: "glide", duration: DUR.ui });
  ScrollTrigger.config({ ignoreMobileResize: true });
  registered = true;
};

registerMotion();

/** Pure JS cubic-bezier, for code that eases values outside GSAP (shaders, camera). */
export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = sampleX(t) - x;
      const d = slopeX(t);
      if (Math.abs(err) < 1e-5 || Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return sampleY(t);
  };
};

const parse = (curve: string) => curve.split(",").map(Number) as [number, number, number, number];
export const easeLatch = bezier(...parse(EASE.latch));
export const easeGlide = bezier(...parse(EASE.glide));
export const easeDrift = bezier(...parse(EASE.drift));

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger, SplitText, useGSAP };
