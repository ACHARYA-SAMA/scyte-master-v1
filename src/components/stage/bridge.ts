"use client";

/**
 * Non-reactive values shared between the DOM and the WebGL stage, read every frame.
 * Kept out of React state so per-frame updates never re-render anything.
 */
export const bridge = {
  /** Screen positions (px) of the six pipeline station anchors, written by the stage. */
  anchors: Array.from({ length: 6 }, () => ({ x: 0, y: 0, visible: false })),
  /** Home hero scroll progress 0..1 (moves the matrix). */
  scroll: 0,
  /** Scan line position for the team HUD, 0..1, or -1 when off. */
  scan: -1,
  /** Portrait sources the team page wants shown. */
  portrait: { slug: "", photo: null as string | null, on: 0 },
};
