"use client";

/**
 * Imperative handle on the route curtain. The Curtain component registers itself;
 * navigation code awaits cover() and reveal().
 */
type Origin = { x: number; y: number };

type CurtainImpl = {
  cover: (origin: Origin, label: string) => Promise<void>;
  reveal: () => Promise<void>;
};

let impl: CurtainImpl | null = null;

export const registerCurtain = (next: CurtainImpl | null) => {
  impl = next;
};

export const curtain = {
  cover: (origin: Origin, label: string) => impl?.cover(origin, label) ?? Promise.resolve(),
  reveal: () => impl?.reveal() ?? Promise.resolve(),
};

/** Resolved by the route watcher when the new pathname has committed. */
let pending: { path: string; resolve: () => void } | null = null;

export const expectRoute = (path: string) =>
  new Promise<void>((resolve) => {
    pending = { path, resolve };
    // Never hang the curtain: give up waiting after 6 s.
    window.setTimeout(() => {
      if (pending?.resolve === resolve) {
        pending = null;
        resolve();
      }
    }, 6000);
  });

export const routeCommitted = (path: string) => {
  if (pending && (pending.path === path || path.startsWith(pending.path.split("#")[0].split("?")[0]))) {
    const { resolve } = pending;
    pending = null;
    resolve();
    return true;
  }
  return false;
};

export const isNavigating = () => pending !== null;
