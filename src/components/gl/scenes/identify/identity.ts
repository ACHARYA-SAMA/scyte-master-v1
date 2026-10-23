"use client";

import { createStore } from "@/lib/store";

/** Shared by the Identify station's DOM controls and its physics scene. */
export const identity = createStore({
  /** WhatsApp marketing consent: a separate box, unticked by default (report 3.2, 4.3) */
  consent: false,
  /** anonymous events that made it through and merged into one profile */
  merged: 0,
  /** tokens that hit the locked gate */
  blocked: 0,
  /** performance.now() of the last refusal, for the gate's flash */
  refusedAt: 0,
  /** set when STOP arrives: consent withdrawn instantly */
  stopped: false,
});

export const setConsent = (on: boolean) => identity.set({ consent: on, stopped: on ? false : identity.get().stopped });

export const stopNow = () => identity.set({ consent: false, stopped: true });

export const refuse = () => identity.set({ refusedAt: performance.now() });
