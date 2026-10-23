"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, CylinderGeometry, DynamicDrawUsage, InstancedMesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, SphereGeometry, type Vector3 } from "three";
import { gl, useStore } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import { C, makeMetal } from "./materials";

export type Bulb = { x: number; y: number; z: number; order: number };

/** Bulbs at an even spacing along polylines, numbered in the order they light. */
export const bulbsAlong = (lines: Vector3[][], spacing: number, z: number): Bulb[] => {
  const out: Bulb[] = [];
  for (const pts of lines) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + pts[i]!.distanceTo(pts[i - 1]!));
    const len = cum[cum.length - 1]!;
    const n = Math.max(1, Math.round(len / spacing));
    const step = len / n;
    for (let k = 0; k <= n; k++) {
      const s = k * step;
      let i = 1;
      while (i < cum.length - 1 && cum[i]! < s) i++;
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const t = (s - cum[i - 1]!) / (cum[i]! - cum[i - 1]! || 1);
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      // where two strokes meet, the second line's first bulb would sit on the last one
      if (out.some((o) => Math.hypot(o.x - x, o.y - y) < spacing * 0.6)) continue;
      out.push({ x, y, z, order: out.length });
    }
  }
  return out;
};

type Props = {
  bulbs: Bulb[];
  radius?: number;
  /** 0 hidden, 1 fully mounted: the bulbs pop in, one after another */
  mount: number;
  /** bumped to run the ignition again */
  ignite: number;
  on: boolean;
  /** seconds between one bulb and the next lighting */
  stagger?: number;
  /** a floor to reflect in, at this y; omit for none */
  floorY?: number;
  /** which way the bulbs face: out of a sign (z) or up off a pipe on the floor (y) */
  facing?: "z" | "y";
  /** drive every lamp from outside instead of the ignition: the level for bulb i at time t */
  level?: (i: number, t: number) => number;
};

type Lamp = { start: number; level: number; seed: number };

/**
 * Marquee bulbs: each a real glass shell, a filament and a socket cap, instanced. Every
 * filament has its own level, so they light in sequence with a flicker that settles,
 * then breathe. The filament is the only thing bright enough to bloom, so the halo
 * sits around a sharp bulb rather than smearing the sign.
 */
export function BulbString({ bulbs, radius = 1.05, mount, ignite, on, stagger = 0.016, floorY, facing = "z", level }: Props) {
  const quality = useStore(gl, (s) => s.quality);
  const n = bulbs.length;
  const shells = useRef<InstancedMesh>(null);
  const cores = useRef<InstancedMesh>(null);
  const caps = useRef<InstancedMesh>(null);
  const glints = useRef<InstancedMesh>(null);

  const geo = useMemo(
    () => ({
      shell: new SphereGeometry(radius, 22, 16),
      core: new SphereGeometry(radius * 0.3, 10, 8),
      cap: facing === "z" ? new CylinderGeometry(radius * 0.62, radius * 0.7, radius * 0.75, 14).rotateX(Math.PI / 2) : new CylinderGeometry(radius * 0.62, radius * 0.7, radius * 0.75, 14),
    }),
    [radius, facing],
  );
  const mat = useMemo(() => {
    const shell =
      quality === 2
        ? new MeshPhysicalMaterial({ color: new Color("#f3ecd8"), roughness: 0.04, metalness: 0, transmission: 1, thickness: radius * 0.6, ior: 1.45, clearcoat: 1, clearcoatRoughness: 0.05 })
        : new MeshStandardMaterial({ color: new Color("#e6d5b8"), roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false });
    return {
      shell,
      core: new MeshBasicMaterial({ color: new Color(1, 1, 1), toneMapped: false }),
      cap: makeMetal("#3a4a3e", 0.28),
      glint: new MeshBasicMaterial({ color: new Color(1, 1, 1), toneMapped: false, transparent: true, opacity: 0.7, depthWrite: false, blending: AdditiveBlending }),
    };
  }, [quality, radius]);

  const lamps = useMemo<Lamp[]>(() => bulbs.map((b) => ({ start: 0, level: 0, seed: (Math.sin(b.order * 91.7) * 43758.5453) % 1 })), [bulbs]);
  const tmp = useMemo(() => ({ o: new Object3D(), c: new Color(), hot: C.lumen.clone(), warm: new Color("#ffe9a6") }), []);
  const fired = useRef({ ignite: -1, at: 0 });

  useEffect(() => {
    for (const r of [shells, cores, caps, glints]) r.current?.instanceMatrix.setUsage(DynamicDrawUsage);
  }, []);
  useEffect(
    () => () => {
      geo.shell.dispose();
      geo.core.dispose();
      geo.cap.dispose();
      Object.values(mat).forEach((m) => m.dispose());
    },
    [geo, mat],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const reduced = prefersReducedMotion();
    const f = fired.current;
    if (f.ignite !== ignite) {
      f.ignite = ignite;
      f.at = t;
    }
    const s = shells.current;
    const c = cores.current;
    const k = caps.current;
    const g = glints.current;
    if (!s || !c || !k) return;
    const visible = mount > 0.001;
    s.visible = c.visible = k.visible = visible;
    if (g) g.visible = visible && floorY !== undefined;
    if (!visible) return;

    for (let i = 0; i < n; i++) {
      const b = bulbs[i]!;
      const L = lamps[i]!;
      // mounting: each bulb pops into its socket a beat after the one before
      const m = Math.min(1, Math.max(0, mount * (n * 0.06 + 1) - i * 0.06));
      // out-back: up past full size and settling into the socket
      const pop = m <= 0 ? 0 : 1 + 2.70158 * (m - 1) ** 3 + 1.70158 * (m - 1) ** 2;
      // the level this lamp wants: off, flickering into life, or lit and breathing
      let want = 0.03;
      if (level) want = level(i, t);
      else if (on) {
        const since = t - f.at - b.order * (reduced ? 0 : stagger);
        if (since > 0) {
          if (!reduced && since < 0.26) {
            const flick = Math.sin(since * 90 + L.seed * 40) * Math.sin(since * 37 + L.seed * 11);
            want = flick > -0.1 ? 0.25 + since * 3 : 0.04;
          } else want = 1 + (reduced ? 0 : Math.sin(t * 1.6 + b.order * 0.37) * 0.05);
        }
      }
      L.level += (want - L.level) * (want > L.level ? 0.6 : 0.12);

      const z = b.z;
      const out = (d: number) => (facing === "z" ? tmp.o.position.set(b.x, b.y, z + d) : tmp.o.position.set(b.x, b.y + d, z));
      out(radius * 0.2);
      tmp.o.rotation.set(0, 0, 0);
      tmp.o.scale.setScalar(pop);
      tmp.o.updateMatrix();
      k.setMatrixAt(i, tmp.o.matrix);
      out(radius * 1.05);
      tmp.o.updateMatrix();
      s.setMatrixAt(i, tmp.o.matrix);
      tmp.o.scale.setScalar(pop * (0.75 + L.level * 0.35));
      tmp.o.updateMatrix();
      c.setMatrixAt(i, tmp.o.matrix);
      // a dim amber filament when off, Lumen with a small hot core when lit; under 2.4 so yellow stays yellow
      tmp.c.copy(tmp.hot).lerp(tmp.warm, Math.min(1, L.level) * 0.35).multiplyScalar(0.12 + L.level * 2.1);
      c.setColorAt(i, tmp.c);
      if (g && floorY !== undefined) {
        // the reflection: mirrored in the floor, dimmer and a little larger, the way a wet floor softens it
        tmp.o.position.set(b.x, 2 * floorY - b.y, z + radius * 1.05);
        tmp.o.scale.setScalar(pop * (0.9 + L.level * 0.5));
        tmp.o.updateMatrix();
        g.setMatrixAt(i, tmp.o.matrix);
        // fading with depth below the floor, so only the bottom strokes read clearly
        const depth = floorY - (2 * floorY - b.y);
        tmp.c.copy(tmp.hot).multiplyScalar(L.level * 0.4 * Math.exp(-depth / 9));
        g.setColorAt(i, tmp.c);
      }
    }
    for (const im of [s, c, k, g]) {
      if (!im) continue;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={caps} args={[geo.cap, mat.cap, n]} />
      <instancedMesh ref={cores} args={[geo.core, mat.core, n]} />
      <instancedMesh ref={shells} args={[geo.shell, mat.shell, n]} renderOrder={3} />
      {floorY !== undefined ? <instancedMesh ref={glints} args={[geo.core, mat.glint, n]} renderOrder={4} /> : null}
    </group>
  );
}
