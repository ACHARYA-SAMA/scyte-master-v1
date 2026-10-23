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
  /** The decisive move: a reticle locks, a clamp closes, a switch throws. */
  snap: "0.62, 0, 0.06, 1",
  /** Alias kept for code written before round 2. */
  latch: "0.62, 0, 0.06, 1",
  /** Entrances and dwell-to-glide camera moves. */
  glide: "0.2, 0.84, 0.16, 1",
  /** Exits accelerate away. */
  cut: "0.6, 0, 0.84, 0.24",
  /** Long scroll-linked in-outs. */
  drift: "0.38, 0, 0.22, 1",
  /** Liquid: the route wipe, fills, a pipe relighting. */
  pour: "0.45, 0, 0.15, 1",
} as const;

export const DUR = {
  feedback: 0.12,
  ui: 0.24,
  panel: 0.48,
  hud: 0.72,
  route: 0.9,
} as const;

export const STAGGER = {
  char: 0.024,
  cell: 0.018,
  line: 0.04,
  panel: 0.07,
} as const;

/** Spring configs for Motion (framer) components. */
export const SPRING = {
  snap: { type: "spring", stiffness: 600, damping: 38, mass: 0.6 },
  latch: { type: "spring", stiffness: 520, damping: 34, mass: 0.6 },
  dock: { type: "spring", stiffness: 210, damping: 22, mass: 0.9 },
  float: { type: "spring", stiffness: 120, damping: 14, mass: 1 },
  magnet: { type: "spring", stiffness: 300, damping: 20, mass: 0.5 },
} as const;

/** The same springs for hand-rolled integrators (cursor, tilt, magnets). */
export type SpringConfig = { stiffness: number; damping: number; mass: number };

/** One semi-implicit Euler step of a damped spring. Returns the new [position, velocity]. */
export const springStep = (x: number, v: number, target: number, c: SpringConfig, dt: number): [number, number] => {
  const h = Math.min(dt, 1 / 30);
  const a = (-c.stiffness * (x - target) - c.damping * v) / c.mass;
  const nv = v + a * h;
  return [x + nv * h, nv];
};

let registered = false;

export const registerMotion = () => {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(CustomEase, ScrollTrigger, SplitText, ScrambleTextPlugin, useGSAP);
  for (const [name, curve] of Object.entries(EASE)) CustomEase.create(name, curve);
  gsap.defaults({ ease: "glide", duration: DUR.ui });
  ScrollTrigger.config({ ignoreMobileResize: true });
  registered = true;
  // for the QA scripts and the browser console in development
  if (process.env.NODE_ENV !== "production") {
    const w = window as unknown as { __scyte?: Record<string, unknown> };
    w.__scyte = { ...w.__scyte, ScrollTrigger, gsap };
  }
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
export const easeSnap = easeLatch;
export const easePour = bezier(...parse(EASE.pour));
export const easeGlide = bezier(...parse(EASE.glide));
export const easeDrift = bezier(...parse(EASE.drift));

/**
 * Reduced motion, from the visitor's switch in the menu when they used it, otherwise
 * from the operating system. The switch writes html[data-motion].
 */
export const prefersReducedMotion = () => {
  if (typeof window === "undefined") return false;
  const choice = document.documentElement.dataset.motion;
  if (choice === "reduced") return true;
  if (choice === "full") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export { gsap, ScrollTrigger, SplitText, useGSAP };
