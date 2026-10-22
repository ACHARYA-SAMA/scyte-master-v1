/**
 * The Scyte wordmark as data. Single source of truth for every rendering of the
 * logo: inline SVG, favicons, OG image, the pixel preloader, slice transitions and
 * the WebGL extrusion.
 *
 * Traced from /public/brand/scyte-logo-original.png (207 x 81). Units are source
 * pixels, with the origin moved to the cap line at the left edge of the S
 * (source x 34.5, y 23.5). Straight edges sit on the half-pixel grid of the
 * original; the Y arms were fitted to the antialiased coverage and keep their
 * 0.264-unit overshoot above the cap line. Proof: `npm run logo:verify`.
 */

export type Point = readonly [number, number];

export type Glyph = {
  readonly char: "S" | "C" | "Y" | "T" | "E";
  /** Closed outline, clockwise, in logo units. */
  readonly outline: readonly Point[];
  /** Horizontal extent, used to cut per-letter slices. */
  readonly x0: number;
  readonly x1: number;
};

export const LOGO_WIDTH = 140;
export const LOGO_CAP_HEIGHT = 37;
export const LOGO_OVERSHOOT = 0.264;
/** Stroke weight of the lettering. One "pixel" of the site's grid motif. */
export const LOGO_STROKE = 5;

export const LOGO_VIEWBOX = `0 -${LOGO_OVERSHOOT} ${LOGO_WIDTH} ${LOGO_CAP_HEIGHT + LOGO_OVERSHOOT}`;
export const LOGO_ASPECT = LOGO_WIDTH / (LOGO_CAP_HEIGHT + LOGO_OVERSHOOT);

export const GLYPHS: readonly Glyph[] = [
  {
    char: "S",
    x0: 0,
    x1: 29,
    outline: [
      [0, 0], [28, 0], [28, 5], [5, 5], [5, 16], [29, 16],
      [29, 37], [1, 37], [1, 32], [24, 32], [24, 21], [0, 21],
    ],
  },
  {
    char: "C",
    x0: 32,
    x1: 60,
    outline: [[32, 0], [60, 0], [60, 5], [37, 5], [37, 32], [60, 32], [60, 37], [32, 37]],
  },
  {
    char: "Y",
    x0: 63.533,
    x1: 85.467,
    outline: [
      [63.533, 2.027], [67.719, -0.264], [74.5, 13.189], [81.281, -0.264], [85.467, 2.027],
      [77, 18.812], [77, 36], [72, 36], [72, 18.812],
    ],
  },
  {
    char: "T",
    x0: 89,
    x1: 116,
    outline: [[89, 0], [116, 0], [116, 5], [105, 5], [105, 36], [100, 36], [100, 5], [89, 5]],
  },
  {
    char: "E",
    x0: 120,
    x1: 140,
    outline: [
      [120, 0], [140, 0], [140, 5], [125, 5], [125, 16], [134.5, 16],
      [134.5, 21], [125, 21], [125, 32], [140, 32], [140, 37], [120, 37],
    ],
  },
];

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

export const glyphPath = (glyph: Glyph) =>
  "M" + glyph.outline.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join("L") + "Z";

/** The complete wordmark as one SVG path. Must match /public/brand/scyte-logo.svg. */
export const LOGO_PATH = GLYPHS.map(glyphPath).join("");

/** Even-odd point-in-polygon test, used to sample the mark into grid cells. */
export const insideGlyph = (glyph: Glyph, x: number, y: number) => {
  let inside = false;
  const pts = glyph.outline;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

export const insideLogo = (x: number, y: number) => GLYPHS.some((g) => insideGlyph(g, x, y));

export type Cell = { x: number; y: number; glyph: number };

/**
 * Sample the mark into square cells of `size` logo units (cell centres tested).
 * The pixel preloader and the event-pixel particles assemble from these.
 */
export const logoCells = (size = 1): Cell[] => {
  const cells: Cell[] = [];
  for (let gy = -LOGO_OVERSHOOT; gy < LOGO_CAP_HEIGHT; gy += size) {
    for (let gx = 0; gx < LOGO_WIDTH; gx += size) {
      const cx = gx + size / 2;
      const cy = gy + size / 2;
      const glyph = GLYPHS.findIndex((g) => insideGlyph(g, cx, cy));
      if (glyph >= 0) cells.push({ x: gx, y: gy, glyph });
    }
  }
  return cells;
};
