"use client";

import { CurvePath, LineCurve3, QuadraticBezierCurve3, Vector3 } from "three";

/**
 * The Junction's floor plan: six pipes fan out from the hub at the logo's own angles
 * to six portals on a ring. The scene and its atmosphere both read it.
 */
export const ANG = [-38, -23, -7.6, 7.6, 23, 38].map((d) => (d * Math.PI) / 180);
export const R = 62;
export const PIPE_Y = 1.3;
export const PIPE_R = 0.85;
export const PORTAL = { w: 10, h: 14, base: 4 };
export const CAM = new Vector3(0, 10, 38);
export const FOV = 44;

export const dirOf = (i: number) => new Vector3(Math.sin(ANG[i]!), 0, -Math.cos(ANG[i]!));
export const at = (i: number, r: number, y: number) => dirOf(i).multiplyScalar(r).setY(y);

/** A pipe: along the floor from the hub, then up into its portal (or out to the pad). */
export const pipeCurve = (i: number, here: boolean) => {
  const path = new CurvePath<Vector3>();
  const start = at(i, 4.5, PIPE_Y);
  if (here) {
    path.add(new LineCurve3(start, at(i, R * 0.42, PIPE_Y)));
    return path;
  }
  const bend = at(i, R - 7, PIPE_Y);
  path.add(new LineCurve3(start, bend));
  path.add(new QuadraticBezierCurve3(bend, at(i, R - 0.5, PIPE_Y), at(i, R, PORTAL.base)));
  return path;
};

export const portalCenter = (i: number) => at(i, R, PORTAL.base + PORTAL.h / 2 + 0.6);
