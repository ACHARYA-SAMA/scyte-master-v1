"use client";

import { createStore } from "./store";

/**
 * What this visitor did on the product page's demo store, so the stations downstream
 * can work with it: the gate merges these events into one profile, the patch bay
 * routes them. Kept in memory only; nothing leaves the page.
 */
export type CollectedEvent = { id: number; name: string; payload: string };

export const visit = createStore({
  events: [] as CollectedEvent[],
  /** the OTP step at checkout */
  verified: false,
});

export const recordEvent = (e: CollectedEvent) => visit.set((s) => ({ events: [...s.events.slice(-15), e] }));
