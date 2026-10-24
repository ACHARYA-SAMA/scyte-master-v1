"use client";

import { useSyncExternalStore } from "react";

/** A minimal external store. React reads it with useStore; animation code reads get(). */
export const createStore = <T extends object>(initial: T) => {
  let state = initial;
  const listeners = new Set<() => void>();
  const get = () => state;
  const set = (patch: Partial<T> | ((s: T) => Partial<T>)) => {
    const next = typeof patch === "function" ? patch(state) : patch;
    let changed = false;
    for (const k in next) if (!Object.is(next[k], state[k])) changed = true;
    if (!changed) return;
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  };
  return { get, set, subscribe, initial };
};

export type Store<T extends object> = ReturnType<typeof createStore<T>>;

export const useStore = <T extends object, S>(store: Store<T>, select: (s: T) => S): S =>
  useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(store.initial),
  );

/** The verbs the cursor can show. Elements opt in with data-cursor. */
export type CursorState = "default" | "link" | "view" | "drag" | "tap" | "scrub" | "open" | "hold" | "turn" | "pull" | "lock" | "hidden" | "steer";
export type TransitionPhase = "idle" | "covering" | "covered" | "revealing";
export type MotionChoice = "auto" | "full" | "reduced";
export type PerfChoice = "auto" | "low";

export type Toast = { id: number; text: string; tone?: "ok" | "info" };

export const ui = createStore({
  cursor: "default" as CursorState,
  cursorLabel: "",
  /** Set by 3D objects under the pointer, which have no DOM element to carry data-cursor. */
  glCursor: null as CursorState | null,
  glCursorLabel: "",
  /** 0..1 while a press-and-hold control is being held. */
  hold: 0,
  soundOn: false,
  menuOpen: false,
  paletteOpen: false,
  passportOpen: false,
  transition: "idle" as TransitionPhase,
  preloaderDone: false,
  webgl: "pending" as "pending" | "deferred" | "ready" | "unsupported",
  motion: "auto" as MotionChoice,
  perf: "auto" as PerfChoice,
  toasts: [] as Toast[],
});

let toastId = 0;
export const toast = (text: string, tone: Toast["tone"] = "info") => {
  const id = ++toastId;
  ui.set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
  window.setTimeout(() => ui.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
};

/** Chapters the current page registers for the rail and the command palette. */
export type Chapter = { id: string; label: string; /** short tick label, e.g. "0:40" */ mark?: string };
export const rail = createStore({
  chapters: [] as Chapter[],
  active: 0,
  /** 0..1 progress through the page. */
  progress: 0,
  /** Whether the rail's playhead scrubs the page (the product page's 20 minutes). */
  scrub: false,
  /** where each chapter starts, as a fraction of the scrollable height */
  marks: [] as number[],
});

/**
 * Which 3D scene the persistent canvas shows, and the scroll inputs it reads.
 * Scenes own their own detail stores; this is only the shared switchboard.
 */
export type SceneKey =
  | "none"
  | "home"
  | "line"
  | "collect"
  | "identify"
  | "understand"
  | "send"
  | "measure"
  | "assembly"
  | "team"
  | "work"
  | "junction"
  | "playlogo";

export const gl = createStore({
  scene: "none" as SceneKey,
  /** 0..1 scroll progress through the active scene's section. */
  progress: 0,
  /** Whether any part of the active scene's section is on screen. */
  visible: false,
  /** Pointer in normalised device coordinates, -1..1. */
  px: 0,
  py: 0,
  quality: 2 as 0 | 1 | 2,
});

/** What this visit has done, kept for the tab session. */
const SESSION_KEY = "scyte.session";
export const session = createStore({ recovered: 0, playbooksRun: [] as string[] });

export const loadSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) session.set(JSON.parse(raw));
  } catch {
    /* a fresh session is fine */
  }
  return session.subscribe(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session.get()));
    } catch {
      /* counter just won't survive a reload */
    }
  });
};

export const recordRecovery = (playbook: string) =>
  session.set((s) => ({
    recovered: s.recovered + 1,
    playbooksRun: s.playbooksRun.includes(playbook) ? s.playbooksRun : [...s.playbooksRun, playbook],
  }));
