"use client";

import { createStore } from "./store";

/**
 * Visit telemetry, computed entirely in the visitor's browser.
 *
 * The site instruments its own visit the way the product instruments a store
 * (engaged time, scroll depth, dwell) and shows the readout back to the visitor.
 * Nothing here is sent anywhere: no network calls, no cookies. Session storage only,
 * so a reload within the tab keeps the count.
 */

export type VisitEventName =
  | "page_view"
  | "engaged_time"
  | "scroll_depth"
  | "pointer_dwell"
  | "cta_hover"
  | "click"
  | "section_view"
  | "menu_open";

export type VisitEvent = {
  name: VisitEventName;
  detail?: string;
  at: number;
  /** Viewport position for the pixel field, 0..1. */
  x?: number;
  y?: number;
};

type Visit = {
  startedAt: number;
  engagedMs: number;
  maxScroll: number;
  events: number;
  pages: string[];
  last: VisitEvent[];
};

const KEY = "scyte.visit.v1";
const ENGAGED_IDLE_MS = 5000;

const load = (): Visit => {
  const fresh: Visit = { startedAt: Date.now(), engagedMs: 0, maxScroll: 0, events: 0, pages: [], last: [] };
  if (typeof window === "undefined") return fresh;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...fresh, ...JSON.parse(raw), last: [] } : fresh;
  } catch {
    return fresh;
  }
};

export const visit = createStore<Visit>({ startedAt: 0, engagedMs: 0, maxScroll: 0, events: 0, pages: [], last: [] });

const listeners = new Set<(e: VisitEvent) => void>();
export const onVisitEvent = (fn: (e: VisitEvent) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const persist = () => {
  const { last, ...rest } = visit.get();
  void last;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* storage can be unavailable in private modes; the readout still works in memory */
  }
};

export const emit = (name: VisitEventName, extra: Partial<VisitEvent> = {}) => {
  const e: VisitEvent = { name, at: Date.now(), ...extra };
  visit.set((s) => ({ events: s.events + 1, last: [e, ...s.last].slice(0, 6) }));
  listeners.forEach((l) => l(e));
};

/**
 * The report's v1 intent score (section 7.3) applied to this visit: a transparent
 * points system that decays over time.
 */
export const intentScore = (v: Visit) => {
  const engagedS = v.engagedMs / 1000;
  let score = 0;
  if (engagedS > 20) score += 10;
  if (engagedS > 60) score += 10;
  if (v.maxScroll > 0.5) score += 10;
  if (v.maxScroll > 0.9) score += 5;
  if (v.pages.includes("/product")) score += 15;
  if (v.pages.includes("/contact")) score += 25;
  score += Math.min(20, Math.floor(v.events / 15));
  return Math.min(100, score);
};

let started = false;

export const startTelemetry = () => {
  if (started || typeof window === "undefined") return () => {};
  started = true;
  // Merge with anything recorded before telemetry started (the first page view).
  visit.set((now) => {
    const saved = load();
    return {
      ...saved,
      events: saved.events + now.events,
      pages: Array.from(new Set([...saved.pages, ...now.pages])),
      last: now.last,
    };
  });

  let lastInput = performance.now();
  let lastTick = performance.now();
  let lastDepthBucket = 0;
  let dwellTimer = 0;

  const markInput = () => {
    lastInput = performance.now();
  };

  const tick = () => {
    const now = performance.now();
    const dt = now - lastTick;
    lastTick = now;
    // Engaged time: tab visible and an input within the last 5 seconds, never tab-open time.
    if (document.visibilityState === "visible" && now - lastInput < ENGAGED_IDLE_MS) {
      const before = Math.floor(visit.get().engagedMs / 10000);
      visit.set((s) => ({ engagedMs: s.engagedMs + dt }));
      const after = Math.floor(visit.get().engagedMs / 10000);
      if (after > before) emit("engaged_time", { detail: `${after * 10}s` });
    }
    persist();
  };
  const interval = window.setInterval(tick, 1000);

  const onScroll = () => {
    markInput();
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const depth = max > 0 ? window.scrollY / max : 0;
    if (depth > visit.get().maxScroll) visit.set({ maxScroll: depth });
    const bucket = Math.floor(depth * 4);
    if (bucket > lastDepthBucket) {
      lastDepthBucket = bucket;
      emit("scroll_depth", { detail: `${Math.min(100, bucket * 25)}%`, x: 0.97, y: depth });
    }
  };

  const onPointer = (ev: PointerEvent) => {
    markInput();
    window.clearTimeout(dwellTimer);
    const x = ev.clientX / window.innerWidth;
    const y = ev.clientY / window.innerHeight;
    dwellTimer = window.setTimeout(() => emit("pointer_dwell", { detail: "1.2s", x, y }), 1200);
  };

  const onClick = (ev: MouseEvent) => {
    markInput();
    const target = (ev.target as HTMLElement | null)?.closest("a,button");
    const label = target?.getAttribute("aria-label") || target?.textContent?.trim().slice(0, 24) || "page";
    emit("click", { detail: label, x: ev.clientX / window.innerWidth, y: ev.clientY / window.innerHeight });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("keydown", markInput);
  window.addEventListener("click", onClick);

  return () => {
    window.clearInterval(interval);
    window.clearTimeout(dwellTimer);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("keydown", markInput);
    window.removeEventListener("click", onClick);
    started = false;
  };
};

export const recordPage = (path: string) => {
  visit.set((s) => ({ pages: s.pages.includes(path) ? s.pages : [...s.pages, path] }));
  emit("page_view", { detail: path });
};
