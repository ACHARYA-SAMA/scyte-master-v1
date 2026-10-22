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
    return () => listeners.delete(l);
  };
  return { get, set, subscribe, initial };
};

type Store<T> = ReturnType<typeof createStore<T & object>>;

export const useStore = <T extends object, S>(store: Store<T>, select: (s: T) => S): S =>
  useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(store.initial),
  );

export type CursorState = "default" | "link" | "view" | "drag" | "lock" | "hidden";
export type SceneKey = "home" | "product" | "team" | "quiet" | "lost";
export type TransitionPhase = "idle" | "covering" | "covered" | "revealing";

export const ui = createStore({
  cursor: "default" as CursorState,
  cursorLabel: "",
  soundOn: false,
  menuOpen: false,
  transition: "idle" as TransitionPhase,
  preloaderDone: false,
  webgl: "pending" as "pending" | "deferred" | "ready" | "unsupported",
});

/** Which formation the persistent event-pixel field should take, and its inputs. */
export const stage = createStore({
  scene: "quiet" as SceneKey,
  /** 0..1 scroll progress through the product pipeline. */
  pipeline: 0,
  /** Index of the team member in focus, -1 for none. */
  member: -1,
  /** Whether the stage is visible behind the current viewport. */
  visible: true,
  consent: true,
});
