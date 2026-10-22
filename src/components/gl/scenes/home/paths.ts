"use client";

import { Vector3 } from "three";
import { centerline, toWorld } from "@/lib/logo/three";

/**
 * The plumbing the drops run through: the letters' own centrelines, plus ducts behind
 * the wordmark (z = -8) that join one letter to the next. All in world units.
 */

export type Path = { id: PathId; pts: Vector3[]; cum: number[]; len: number };

export type PathId =
  | "feed"
  | "S"
  | "SC"
  | "C"
  | "CY"
  | "Ystem"
  | "Ypaid"
  | "Yfail"
  | "rescue"
  | "YT"
  | "T"
  | "TE"
  | "Espine"
  | "Etop"
  | "Emid"
  | "Ebottom";

const BACK = -8;
const W = (x: number, y: number, z = 0) => toWorld(x, y, z);

/** Where drops come from: the screen of the storefront laptop, above and behind the S. */
export const STORE = { position: new Vector3(-62, 40, -22), screen: new Vector3(-62, 41.5, -20.6) };

const build = (id: PathId, pts: Vector3[]): Path => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { id, pts, cum, len: cum[cum.length - 1] };
};

export const PATHS: Record<PathId, Path> = {
  feed: build("feed", [STORE.screen.clone(), new Vector3(-62, 41.5, BACK), new Vector3(-44, 41.5, BACK), W(26, 2.5, BACK), W(26, 2.5, 0)]),
  S: build("S", centerline("S")),
  SC: build("SC", [W(3.5, 34.5, 0), W(3.5, 34.5, BACK), W(57.5, 34.5, BACK), W(57.5, 34.5, 0)]),
  C: build("C", centerline("C")),
  CY: build("CY", [W(57.5, 2.5, 0), W(57.5, 2.5, BACK), W(57.5, 33.5, BACK), W(74.5, 33.5, BACK), W(74.5, 33.5, 0)]),
  Ystem: build("Ystem", centerline("Ystem")),
  Ypaid: build("Ypaid", centerline("Ypaid")),
  Yfail: build("Yfail", centerline("Yfail")),
  rescue: build("rescue", [W(65.7, 1.2, 0), W(65.7, 1.2, BACK), W(65.7, -7, BACK), W(91.5, -7, BACK), W(91.5, 2.5, BACK), W(91.5, 2.5, 0)]),
  YT: build("YT", [W(83.3, 1.2, 0), W(83.3, 1.2, BACK), W(91.5, 2.5, BACK), W(91.5, 2.5, 0)]),
  T: build("T", centerline("T")),
  TE: build("TE", [W(102.5, 33.5, 0), W(102.5, 33.5, BACK), W(122.5, 34.5, BACK), W(122.5, 34.5, 0)]),
  Espine: build("Espine", centerline("Espine")),
  Etop: build("Etop", centerline("Etop")),
  Emid: build("Emid", centerline("Emid")),
  Ebottom: build("Ebottom", centerline("Ebottom")),
};

/** The ducts drawn behind the letters. */
export const DUCTS: PathId[] = ["feed", "SC", "CY", "rescue", "YT", "TE"];

/** The order light fills the system in, for the liquid cores. */
export const FILL_ORDER: PathId[] = ["feed", "S", "SC", "C", "CY", "Ystem", "Ypaid", "YT", "T", "TE", "Espine", "Etop", "Emid", "Ebottom"];

export const fillRanges = (() => {
  const total = FILL_ORDER.reduce((s, id) => s + PATHS[id].len, 0);
  let acc = 0;
  const out = {} as Record<PathId, [number, number]>;
  for (const id of FILL_ORDER) {
    const a = acc / total;
    acc += PATHS[id].len;
    out[id] = [a, acc / total];
  }
  // the failing arm and its rescue loop light only when the leaks are clamped
  out.Yfail = out.Ypaid;
  out.rescue = out.YT;
  return out;
})();

/** Point at arc length s along a path. Writes into `out`. */
export const pointAt = (p: Path, s: number, out: Vector3) => {
  const d = Math.max(0, Math.min(p.len, s));
  let i = 1;
  while (i < p.cum.length - 1 && p.cum[i] < d) i++;
  const a = p.pts[i - 1];
  const b = p.pts[i];
  const seg = p.cum[i] - p.cum[i - 1] || 1;
  return out.copy(a).lerp(b, (d - p.cum[i - 1]) / seg);
};

/** Unit direction of travel at arc length s. Writes into `out`. */
export const dirAt = (p: Path, s: number, out: Vector3) => {
  const d = Math.max(0, Math.min(p.len, s));
  let i = 1;
  while (i < p.cum.length - 1 && p.cum[i] < d) i++;
  return out.copy(p.pts[i]).sub(p.pts[i - 1]).normalize();
};

/** Where the four cracks sit along the failing arm, as fractions, in REASONS order. */
export const CRACK_AT = [0.22, 0.42, 0.62, 0.82];

export const crackPoint = (i: number, z = 2.6) => {
  const v = pointAt(PATHS.Yfail, PATHS.Yfail.len * CRACK_AT[i], new Vector3());
  v.z = z;
  return v;
};
