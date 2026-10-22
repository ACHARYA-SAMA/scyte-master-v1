import { Shape, Vector3 } from "three";
import { GLYPHS, LOGO_CAP_HEIGHT, LOGO_OVERSHOOT, LOGO_WIDTH, type Glyph } from "./geometry";

/**
 * The wordmark in 3D. Logo units stay logo units: x right, y up, the mark centred on
 * the origin, strokes 5 deep so every stroke becomes a square-section duct.
 */

export const LOGO_CX = LOGO_WIDTH / 2;
export const LOGO_CY = (LOGO_CAP_HEIGHT - LOGO_OVERSHOOT) / 2;
export const DEPTH = 5;

export const toWorld = (x: number, y: number, z = 0) => new Vector3(x - LOGO_CX, -(y - LOGO_CY), z);

export const glyphShape = (g: Glyph) => {
  const s = new Shape();
  g.outline.forEach(([x, y], i) => {
    const p = toWorld(x, y);
    if (i === 0) s.moveTo(p.x, p.y);
    else s.lineTo(p.x, p.y);
  });
  s.closePath();
  return s;
};

export const glyphShapes = () => GLYPHS.map(glyphShape);

/**
 * Stroke centrelines, in logo units, in the direction light flows through each
 * letter. S is the browse, C the cart, Y the payment fork, T the decision, E the send.
 */
export const CENTERLINES = {
  S: [
    [26, 2.5],
    [2.5, 2.5],
    [2.5, 18.5],
    [26.5, 18.5],
    [26.5, 34.5],
    [3.5, 34.5],
  ],
  C: [
    [57.5, 34.5],
    [34.5, 34.5],
    [34.5, 2.5],
    [57.5, 2.5],
  ],
  /** the stem, rising to the fork */
  Ystem: [
    [74.5, 33.5],
    [74.5, 15.6],
  ],
  /** the failing arm: where UPI timeouts and declines leak out */
  Yfail: [
    [74.5, 15.6],
    [65.7, 1.2],
  ],
  /** the paying arm */
  Ypaid: [
    [74.5, 15.6],
    [83.3, 1.2],
  ],
  T: [
    [91.5, 2.5],
    [102.5, 2.5],
    [102.5, 33.5],
  ],
  Espine: [
    [122.5, 34.5],
    [122.5, 2.5],
  ],
  Etop: [
    [122.5, 2.5],
    [137.5, 2.5],
  ],
  Emid: [
    [122.5, 18.5],
    [132, 18.5],
  ],
  Ebottom: [
    [122.5, 34.5],
    [137.5, 34.5],
  ],
} as const satisfies Record<string, readonly (readonly [number, number])[]>;

export type LineKey = keyof typeof CENTERLINES;

/** Centreline points in world space, at depth z (0 is the middle of the stroke). */
export const centerline = (k: LineKey, z = 0) => CENTERLINES[k].map(([x, y]) => toWorld(x, y, z));
