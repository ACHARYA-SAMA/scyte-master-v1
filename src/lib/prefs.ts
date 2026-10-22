"use client";

import { ui, type MotionChoice, type PerfChoice } from "./store";
import { setSound } from "./sound";

/**
 * Visitor preferences: motion, performance and sound. Remembered per browser, applied
 * to <html> so CSS and the motion helpers read the same answer.
 */
const KEYS = { motion: "scyte.motion", perf: "scyte.perf" } as const;

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* preference just won't persist */
  }
};

const applyMotion = (m: MotionChoice) => {
  const html = document.documentElement;
  if (m === "auto") delete html.dataset.motion;
  else html.dataset.motion = m;
};

export const loadPrefs = () => {
  const motion = (read(KEYS.motion) as MotionChoice | null) ?? "auto";
  const perf = (read(KEYS.perf) as PerfChoice | null) ?? "auto";
  applyMotion(motion);
  document.documentElement.dataset.perf = perf;
  ui.set({ motion, perf });
};

export const setMotion = (m: MotionChoice) => {
  applyMotion(m);
  write(KEYS.motion, m);
  ui.set({ motion: m });
};

export const setPerf = (p: PerfChoice) => {
  document.documentElement.dataset.perf = p;
  write(KEYS.perf, p);
  ui.set({ perf: p });
};

/** Effective reduced-motion answer, for React code that re-renders on change. */
export const isReduced = (choice: MotionChoice, osReduced: boolean) =>
  choice === "reduced" || (choice === "auto" && osReduced);

export const toggleSound = () => setSound(!ui.get().soundOn);

/** A short buzz on phones that support it. Silent everywhere else. */
export const haptic = (pattern: number | number[] = 12) => {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some browsers throw outside a user gesture */
  }
};
