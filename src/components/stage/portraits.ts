"use client";

import * as THREE from "three";
import { SIL_H, SIL_W, silhouetteCanvas } from "@/lib/silhouette";

/** Portrait textures for the halftone: a real photo from Member.photo, else the generated silhouette. */

export const portraitTexture = (slug: string, photo: string | null): Promise<THREE.Texture> =>
  new Promise((resolve) => {
    const finish = (canvas: HTMLCanvasElement) => {
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.NoColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      resolve(t);
    };
    if (!photo) return finish(silhouetteCanvas(slug, 0.5));
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      // grayscale into a canvas so the shader reads luminance from the red channel
      const c = document.createElement("canvas");
      const scale = Math.min(1, 900 / img.height);
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const g = c.getContext("2d", { willReadFrequently: true })!;
      g.filter = "grayscale(1) contrast(1.15)";
      g.drawImage(img, 0, 0, c.width, c.height);
      finish(c);
    };
    img.onerror = () => finish(silhouetteCanvas(slug, 0.5));
    img.src = photo;
  });

export const PORTRAIT_ASPECT = SIL_W / SIL_H;

export const blankTexture = () => {
  const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
};
