"use client";

import { createStore } from "@/lib/store";
import { OPEN_SLOTS, THIS_SITE, THIS_SITE_SCENES, WORK, type OpenSlot } from "@/data/work";

/** One frame on the archive strip: a client case, a scene of this site, or an open slot. */
export type Plate = {
  key: string;
  kind: "case" | "scene" | "slot";
  /** small line above the title */
  meta: string;
  title: string;
  href: string;
  img?: string;
  slot?: OpenSlot;
};

export const PLATES: Plate[] = [
  ...WORK.map((w) => ({ key: w.slug, kind: "case" as const, meta: `${w.year}, ${w.services.join(", ")}`, title: w.client, href: `/work/${w.slug}`, img: w.cover })),
  ...THIS_SITE_SCENES.map((s) => ({
    key: s.id,
    kind: "scene" as const,
    meta: `Case 00, ${s.page}`,
    title: s.title,
    href: `/work/${THIS_SITE.slug}#scene-${s.id}`,
    img: s.img,
  })),
  // a slot closes once a client case in that service is listed
  ...OPEN_SLOTS.filter((o) => !WORK.some((w) => w.services.includes(o.service))).map((o) => ({
    key: `slot-${o.id}`,
    kind: "slot" as const,
    meta: `Open, ${o.service}`,
    title: o.title,
    href: o.href,
    slot: o,
  })),
];

/** Every plate image is 16:10. */
export const PLATE_ASPECT = 1.6;

/**
 * Per-frame state shared by the DOM strip (which owns layout, input and physics) and
 * the WebGL plates (which draw where the DOM says). Plain mutable data: no React in
 * the loop.
 */
export const strip = {
  /** the strip's clipping element; the scene reads its rect every frame */
  el: null as HTMLElement | null,
  /** px the strip has travelled, and its velocity in px/s */
  offset: 0,
  vel: 0,
  /** first frame's left and top inside `el` at offset 0, frame size and pitch, px */
  x0: 0,
  y0: 0,
  w: 0,
  h: 0,
  pitch: 0,
  /** plate under the pointer, and the pointer on it in uv (y up) */
  hover: -1,
  mx: 0.5,
  my: 0.5,
  /** plate growing to fill the screen on the way to its case, and how far, 0..1 */
  expand: -1,
  e: 0,
};

/** What React needs to know about the GL side. */
export const archiveGl = createStore({ ready: false });
