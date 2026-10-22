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

/**
 * The silhouette as a halftone of square event pixels, bone on forest: the DOM twin
 * of the WebGL portrait, for thumbnails and the dossier.
 */
export const halftoneDataUrl = (slug: string, width = 160, cell = 8) => {
  const height = Math.round((width * SIL_H) / SIL_W);
  const cols = Math.floor(width / cell);
  const rows = Math.floor(height / cell);
  // Paint the silhouette only as large as the halftone samples it (4 px per cell).
  const src = silhouetteCanvas(slug, (cols * 4) / SIL_W);
  const sample = document.createElement("canvas");
  sample.width = cols;
  sample.height = rows;
  const sg = sample.getContext("2d", { willReadFrequently: true })!;
  sg.drawImage(src, 0, 0, cols, rows);
  const px = sg.getImageData(0, 0, cols, rows).data;
  const out = document.createElement("canvas");
  out.width = cols * cell;
  out.height = rows * cell;
  const g = out.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#1c261f";
  g.fillRect(0, 0, out.width, out.height);
  g.fillStyle = "#c2b897";
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const l = px[(y * cols + x) * 4] / 255;
      const s = Math.floor(Math.pow(l, 0.85) * cell * 0.94);
      if (s < 1) continue;
      const o = Math.floor((cell - s) / 2);
      g.fillRect(x * cell + o, y * cell + o, s, s);
    }
  }
  return out.toDataURL("image/png");
};
