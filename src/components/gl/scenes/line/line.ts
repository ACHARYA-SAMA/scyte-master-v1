"use client";

import { createStore } from "@/lib/store";

/**
 * The machine as one line: six stations along a belt. Shared between the hero's DOM
 * (the timeline, the station list) and the WebGL scene.
 */
export const LINE_STATIONS = [
  { id: "collect", n: "01", name: "Collect", at: "0:00", line: "Every event, from the browser and the gateway" },
  { id: "identify", n: "02", name: "Identify", at: "2:10", line: "A phone number, only with consent" },
  { id: "understand", n: "03", name: "Understand", at: "2:40", line: "Intent as a score you can read" },
  { id: "decide", n: "04", name: "Decide", at: "3:00", line: "Rules, caps, quiet hours, holdout" },
  { id: "send", n: "05", name: "Send", at: "3:05", line: "Approved templates, official API" },
  { id: "measure", n: "06", name: "Measure", at: "Week 4", line: "Revenue against a holdout" },
] as const;

export type LineStationId = (typeof LINE_STATIONS)[number]["id"];

export const line = createStore({
  /** which station Aarav's token is at, 0..5 */
  station: 0,
  /** the station under the pointer, or -1 */
  hover: -1,
  /** bumped when a station is clicked in the scene, so the DOM can scroll to it */
  jump: { id: "" as LineStationId | "", n: 0 },
  /** drops currently riding the belt, as the scene counts them */
  onBelt: 0,
  /** drops that reached the holdout lane since the scene mounted */
  heldOut: 0,
  /** drops that reached the messaged bin */
  messaged: 0,
});
