"use client";

import * as THREE from "three";

/**
 * Portrait sources for the halftone. Real photos load from Member.photo; until then
 * each seat gets a generated silhouette (head and shoulders, side-lit) so the page
 * never shows a stock face or an invented person.
 */

const W = 480;
const H = 600;

const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const seedOf = (slug: string) => {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) h = Math.imul(h ^ slug.charCodeAt(i), 16777619);
  return h >>> 0;
};

export const silhouetteCanvas = (slug: string) => {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const r = rng(seedOf(slug));

  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);

  const cx = W * (0.62 + r() * 0.08);
  const headY = H * (0.36 + r() * 0.05);
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

export const portraitTexture = (slug: string, photo: string | null): Promise<THREE.Texture> =>
  new Promise((resolve) => {
    const finish = (canvas: HTMLCanvasElement) => {
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.NoColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      resolve(t);
    };
    if (!photo) return finish(silhouetteCanvas(slug));
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      // grayscale into a canvas so the shader reads luminance from the red channel
      const c = document.createElement("canvas");
      const scale = Math.min(1, 900 / img.height);
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const g = c.getContext("2d")!;
      g.filter = "grayscale(1) contrast(1.15)";
      g.drawImage(img, 0, 0, c.width, c.height);
      finish(c);
    };
    img.onerror = () => finish(silhouetteCanvas(slug));
    img.src = photo;
  });

export const PORTRAIT_ASPECT = W / H;

export const blankTexture = () => {
  const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
};
