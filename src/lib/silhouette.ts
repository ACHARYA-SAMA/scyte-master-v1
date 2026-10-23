"use client";

/**
 * Generated placeholder portraits: head and shoulders, side-lit, varied per seat.
 * Used for the WebGL halftone and the DOM thumbnails until a real photo is supplied,
 * so the team page never shows a stock face or an invented person.
 */

export const SIL_W = 480;
export const SIL_H = 600;

const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const seedOf = (slug: string) => {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) h = Math.imul(h ^ slug.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Draws at `scale` of the 480 x 600 design size: callers ask for what they sample. */
export const silhouetteCanvas = (slug: string, scale = 1) => {
  const W = SIL_W;
  const H = SIL_H;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(W * scale));
  c.height = Math.max(1, Math.round(H * scale));
  // CPU-backed: these canvases are read straight back, and a GPU canvas would stall on readback.
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.scale(scale, scale);
  const r = rng(seedOf(slug));

  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);

  const cx = W * (0.6 + r() * 0.06);
  const headY = H * (0.37 + r() * 0.04);
  const headR = W * (0.15 + r() * 0.025);
  const shoulder = W * (0.42 + r() * 0.08);
  const lightLeft = r() > 0.5;

  // side light: brighter on one flank, falling off across the form
  const grad = g.createLinearGradient(lightLeft ? cx - shoulder : cx + shoulder, 0, lightLeft ? cx + shoulder : cx - shoulder, 0);
  grad.addColorStop(0, "#e8e8e8");
  grad.addColorStop(0.55, "#8a8a8a");
  grad.addColorStop(1, "#262626");
  g.fillStyle = grad;

  // shoulders and torso
  g.beginPath();
  g.moveTo(cx - shoulder, H);
  g.bezierCurveTo(cx - shoulder, H * 0.74, cx - shoulder * 0.55, H * 0.66, cx - headR * 0.6, H * 0.62);
  g.lineTo(cx + headR * 0.6, H * 0.62);
  g.bezierCurveTo(cx + shoulder * 0.55, H * 0.66, cx + shoulder, H * 0.74, cx + shoulder, H);
  g.closePath();
  g.fill();

  // neck
  g.fillRect(cx - headR * 0.42, headY + headR * 0.6, headR * 0.84, H * 0.62 - headY - headR * 0.5);

  // head
  g.beginPath();
  g.ellipse(cx, headY, headR * 0.86, headR * 1.08, (r() - 0.5) * 0.12, 0, Math.PI * 2);
  g.fill();

  // hair mass, varied per seat
  g.fillStyle = "#1a1a1a";
  g.beginPath();
  g.ellipse(cx + (r() - 0.5) * headR * 0.3, headY - headR * 0.55, headR * (0.9 + r() * 0.2), headR * (0.5 + r() * 0.25), 0, Math.PI, Math.PI * 2);
  g.fill();

  // the rim light that makes it read as a person rather than a shape
  g.strokeStyle = "rgba(255,255,255,0.85)";
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(cx, headY, headR * 0.86, headR * 1.08, 0, lightLeft ? Math.PI * 0.7 : -Math.PI * 0.3, lightLeft ? Math.PI * 1.3 : Math.PI * 0.3);
  g.stroke();

  return c;
};

/** Where the generated face sits, as a fraction of the portrait, for the HUD. */
export const FACE = { x: 0.63, y: 0.38 };

const RAMP: [number, number, number][] = [
  [9, 18, 11], // abyss
  [43, 58, 47], // raised
  [146, 152, 132], // muted
  [194, 184, 151], // khaki
  [230, 213, 184], // cream
];

const ramp = (t: number): [number, number, number] => {
  const x = Math.min(0.9999, Math.max(0, t)) * (RAMP.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = RAMP[i];
  const b = RAMP[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
};

/**
 * The silhouette in the palette, abyss through khaki to cream: the DOM twin of the
 * hologram, for the dock and the dossier. Clean tones, no halftone.
 */
export const duotoneDataUrl = (slug: string, width = 160) => {
  const scale = width / SIL_W;
  const src = silhouetteCanvas(slug, scale);
  const g = src.getContext("2d", { willReadFrequently: true })!;
  const img = g.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, gg, b] = ramp(Math.pow(d[i] / 255, 0.9) * 0.92 + 0.04);
    d[i] = r;
    d[i + 1] = gg;
    d[i + 2] = b;
  }
  g.putImageData(img, 0, 0);
  return src.toDataURL("image/png");
};

/** A soft depth map for a generated silhouette: its own luminance, blurred. */
export const silhouetteDepth = (slug: string, size = 256) => {
  const src = silhouetteCanvas(slug, size / SIL_H);
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.filter = `blur(${Math.max(2, Math.round(size / 40))}px)`;
  g.drawImage(src, 0, 0);
  return c;
};
