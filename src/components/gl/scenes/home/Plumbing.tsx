"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CurvePath, LineCurve3, Matrix4, Quaternion, TubeGeometry, Vector3, type BufferGeometry, type ShaderMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gl } from "@/lib/store";
import { makeGlass, makeLiquid, makeMetal } from "../../materials";
import { DUCTS, PATHS, fillRanges, type PathId } from "./paths";
import { HOME_CHAPTERS, leak } from "./leak";

const DUCT = 2.6;
const up = new Vector3(0, 1, 0);

/** A square duct along each segment of a path, plus a cube at every joint. */
const ductGeometry = (ids: PathId[]) => {
  const parts: BufferGeometry[] = [];
  const m = new Matrix4();
  const q = new Quaternion();
  for (const id of ids) {
    const pts = PATHS[id].pts.map((p) => p.clone());
    // stop at the back face of a letter instead of running through it
    if (pts[0].z === 0) pts[0].z = -2.7;
    if (pts[pts.length - 1].z === 0) pts[pts.length - 1].z = -2.7;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const len = a.distanceTo(b);
      if (len < 0.01) continue;
      const g = new BoxGeometry(DUCT, len, DUCT);
      q.setFromUnitVectors(up, b.clone().sub(a).normalize());
      m.compose(a.clone().add(b).multiplyScalar(0.5), q, new Vector3(1, 1, 1));
      g.applyMatrix4(m);
      parts.push(g);
    }
    for (let i = 1; i < pts.length - 1; i++) {
      const g = new BoxGeometry(DUCT, DUCT, DUCT);
      g.translate(pts[i].x, pts[i].y, pts[i].z);
      parts.push(g);
    }
  }
  return mergeGeometries(parts.map((p) => p.toNonIndexed()), false);
};

/** Metal flanges where ducts meet the back of a letter. */
const flangeGeometry = (ids: PathId[]) => {
  const parts: BufferGeometry[] = [];
  for (const id of ids) {
    const pts = PATHS[id].pts;
    for (const p of [pts[0], pts[pts.length - 1]]) {
      if (p.z !== 0) continue;
      const g = new BoxGeometry(DUCT + 0.9, DUCT + 0.9, 0.55);
      g.translate(p.x, p.y, -3.05);
      parts.push(g);
    }
  }
  return mergeGeometries(parts, false);
};

const coreGeometry = (id: PathId, radius: number) => {
  const pts = PATHS[id].pts;
  const curve = new CurvePath<Vector3>();
  for (let i = 1; i < pts.length; i++) curve.add(new LineCurve3(pts[i - 1], pts[i]));
  return new TubeGeometry(curve as never, Math.max(8, Math.round(PATHS[id].len * 1.5)), radius, 8, false);
};

const ALL: PathId[] = ["feed", "S", "SC", "C", "CY", "Ystem", "Ypaid", "Yfail", "rescue", "YT", "T", "TE", "Espine", "Etop", "Emid", "Ebottom"];

/**
 * Ducts behind the wordmark that join letter to letter, and a liquid core running
 * through every path. The cores fill in story order as the flow chapter plays; the
 * failing arm and its rescue loop light only as its cracks are clamped.
 */
export function Plumbing() {
  const ducts = useMemo(() => ductGeometry(DUCTS), []);
  const flanges = useMemo(() => flangeGeometry(DUCTS), []);
  const glass = useMemo(() => makeGlass({ thickness: 1.8, roughness: 0.12 }), []);
  const metal = useMemo(() => makeMetal("#2b3a2f", 0.34), []);
  const cores = useMemo(
    () =>
      ALL.map((id) => {
        const inLetter = !DUCTS.includes(id);
        const mat = makeLiquid();
        mat.uniforms.uLength.value = PATHS[id].len;
        return { id, geometry: coreGeometry(id, inLetter ? 0.22 : 0.17), material: mat };
      }),
    [],
  );
  const fill = useRef(0);

  useEffect(
    () => () => {
      ducts.dispose();
      flanges.dispose();
      glass.dispose();
      metal.dispose();
      cores.forEach((c) => {
        c.geometry.dispose();
        c.material.dispose();
      });
    },
    [ducts, flanges, glass, metal, cores],
  );

  useFrame((_, dt) => {
    const p = gl.get().progress;
    const [a, b] = HOME_CHAPTERS.flow;
    // light starts pouring as the glass appears, and is full by the end of the flow
    const target = Math.min(1, Math.max(0, (p - 0.012) / (b - a + 0.05)));
    fill.current += (target - fill.current) * Math.min(1, dt * 3);
    const sealed = leak.get().sealed.filter(Boolean).length / 4;
    const t = performance.now() / 1000;
    const slow = p > HOME_CHAPTERS.leaks[0] && p < HOME_CHAPTERS.leaks[1] ? 0.3 : 1;
    for (const c of cores) {
      const u = c.material.uniforms;
      u.uTime.value = t;
      u.uSpeed.value = slow;
      const [s0, s1] = fillRanges[c.id];
      let f = Math.min(1, Math.max(0, (fill.current - s0) / Math.max(0.001, s1 - s0)));
      if (c.id === "Yfail" || c.id === "rescue") f = Math.min(f, sealed);
      u.uFlow.value = f;
    }
  });

  return (
    <group>
      <mesh geometry={ducts} material={glass} renderOrder={1} />
      <mesh geometry={flanges} material={metal} />
      {cores.map((c) => (
        <mesh key={c.id} geometry={c.geometry} material={c.material as ShaderMaterial} />
      ))}
    </group>
  );
}
