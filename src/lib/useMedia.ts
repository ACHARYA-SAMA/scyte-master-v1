"use client";

import { useSyncExternalStore } from "react";

/** A media query as state, hydration-safe: the server always answers false. */
export const useMedia = (query: string) =>
  useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
