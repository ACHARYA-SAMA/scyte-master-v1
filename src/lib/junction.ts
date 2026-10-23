"use client";

import { ROUTES, routeFor } from "@/config/site";
import { createStore, type SceneKey } from "@/lib/store";

/**
 * The Junction: six fixed slots in nav order, the same on every page, so visitors
 * build a map of the site in their heads. Slot 0 is far left, slot 5 far right.
 */
export const SLOTS = ROUTES.map((r, i) => ({
  i,
  href: r.href,
  label: r.label,
  chapter: r.chapter,
  /** one line under the sign */
  line: r.blurb.split(/[.:]/)[0]!.trim(),
  /** the direction you lean to take it */
  glyph: ["↖", "↖", "↑", "↑", "↗", "↗"][i]!,
}));

/** What each destination draws first, so its scene can be fetched while you steer. */
export const SCENE_FOR: Record<string, SceneKey | null> = {
  "/": "home",
  "/product": "line",
  "/studio": "assembly",
  "/work": "work",
  "/team": "team",
  "/contact": null,
};

/** Which slot a path belongs to; -1 for pages outside the six (the 404). */
export const slotOf = (path: string) => {
  const r = routeFor(path);
  return r ? ROUTES.findIndex((x) => x.href === r.href) : -1;
};

/** The next page in story order, the one the Junction flags Continue. */
export const storyNext = (path: string) => {
  const here = slotOf(path);
  return here < 0 ? 0 : (here + 1) % SLOTS.length;
};

/** Pixels of deliberate scroll that fill a pipe. */
export const CHARGE_PX = 1100;
/** Input is ignored this long after arriving, so momentum cannot launch anyone. */
export const LOCK_MS = 450;
/** The dive down the pipe, ms. */
export const TRAVEL_MS = 700;

export type JunctionPhase = "away" | "arriving" | "steering" | "charging" | "travel";

export const junction = createStore({
  phase: "away" as JunctionPhase,
  /** the highlighted slot */
  hi: 0,
  /** this page's slot, -1 on the 404 */
  here: 0,
  /** the story-next slot */
  next: 1,
  /** 0..1, how full the highlighted pipe is */
  charge: 0,
  /** the slot being travelled to, and when the dive started (performance.now) */
  target: -1,
  travelAt: 0,
  /** the scene has drawn its chamber: the cover can lift */
  drawn: false,
});

/* ---------------------------------------------------------------- visited pages */
const VISITED_KEY = "scyte.visited";

/** Pages seen on this device, for the frame's minimap. Kept in this browser only. */
export const visited = createStore({ hrefs: [] as string[] });

export const markVisited = (path: string) => {
  const slot = slotOf(path);
  if (slot < 0) return;
  const href = SLOTS[slot]!.href;
  visited.set((s) => {
    if (s.hrefs.includes(href)) return {};
    const hrefs = [...s.hrefs, href];
    try {
      localStorage.setItem(VISITED_KEY, JSON.stringify(hrefs));
    } catch {
      /* private mode: the minimap simply forgets */
    }
    return { hrefs };
  });
};

export const loadVisited = () => {
  try {
    const raw = localStorage.getItem(VISITED_KEY);
    const hrefs = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(hrefs)) visited.set({ hrefs: hrefs.filter((h): h is string => typeof h === "string") });
  } catch {
    /* nothing stored, or storage blocked */
  }
};

// for the QA scripts and the browser console in development
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __scyte?: Record<string, unknown> }).__scyte = { ...(window as unknown as { __scyte?: Record<string, unknown> }).__scyte, junction };
}

/* ---------------------------------------------------------------- travel from anywhere */
let travelImpl: ((slot: number) => void) | null = null;

/** The Junction registers how it commits; the frame's minimap and the menu travel through it. */
export const registerTravel = (fn: ((slot: number) => void) | null) => {
  travelImpl = fn;
};

export const travelTo = (slot: number) => travelImpl?.(slot);
