"use client";

import { Vector3, type Camera } from "three";

/**
 * 3D points the DOM wants to label. Scenes project them every frame; HUD labels read
 * the screen positions in their own animation frame. No React state in the loop.
 */
export type Anchor = { x: number; y: number; z: number; onScreen: boolean };

const anchors = new Map<string, Anchor>();
const v = new Vector3();

export const projectAnchors = (camera: Camera, points: Record<string, Vector3>, width: number, height: number) => {
  for (const [id, p] of Object.entries(points)) {
    v.copy(p).project(camera);
    const a = anchors.get(id) ?? { x: 0, y: 0, z: 0, onScreen: false };
    a.x = (v.x * 0.5 + 0.5) * width;
    a.y = (-v.y * 0.5 + 0.5) * height;
    a.z = v.z;
    a.onScreen = v.z < 1 && v.x > -1.1 && v.x < 1.1 && v.y > -1.1 && v.y < 1.1;
    anchors.set(id, a);
  }
};

export const readAnchor = (id: string) => anchors.get(id);

export const clearAnchors = () => anchors.clear();
