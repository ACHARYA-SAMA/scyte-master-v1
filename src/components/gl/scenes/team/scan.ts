"use client";

import { createStore } from "@/lib/store";

/** What the hologram shows. The DOM sets it; the scene reads it every frame. */
export const scan = createStore({
  slug: null as string | null,
  photo: null as string | null,
  depth: null as string | null,
  /** where the face sits in the portrait, as uv (y down) */
  face: [0.63, 0.38] as [number, number],
  /** performance.now() of the last lock, for the sweep and the HUD clock */
  lockedAt: 0,
  /** the hologram's current turn, in degrees, for the HUD readout */
  rot: 0,
  /** the sensitivity knob, 0..100: how deep the relief and how thick the points */
  sensitivity: 60,
});
