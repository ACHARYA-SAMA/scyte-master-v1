"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, LineBasicMaterial, Mesh, PlaneGeometry, Quaternion, Vector3 } from "three";
import { gl, ui } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import { easeSnap } from "@/lib/motion";
import { C, makeGlow, makeMetal } from "../../materials";
import { CRACK_AT, PATHS, crackPoint, dirAt } from "./paths";
import { HOME_CHAPTERS, leak, sealCrack } from "./leak";

const HOLD_SECONDS = 0.85;

/** A jagged fracture drawn on the front face of the glass, around a point. */
const fractureGeometry = (seed: number) => {
  const pts: number[] = [];
  let rnd = seed * 9301 + 49297;
  const r = () => {
    rnd = (rnd * 9301 + 49297) % 233280;
    return rnd / 233280;
  };
  for (let arm = 0; arm < 5; arm++) {
    let x = 0;
    let y = 0;
    const ang = (arm / 5) * Math.PI * 2 + r() * 0.8;
    for (let k = 0; k < 4; k++) {
      const a = ang + (r() - 0.5) * 0.9;
      const len = 0.35 + r() * 0.5;
      const nx = x + Math.cos(a) * len;
      const ny = y + Math.sin(a) * len;
      pts.push(x, y, 0, nx, ny, 0);
      x = nx;
      y = ny;
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pts, 3));
  return g;
};

/**
 * The four cracks on the failing arm, one per reason code. Pressing and holding a
 * crack closes a brushed-metal clamp around the duct and the leak stops. The DOM
 * chapter offers the same holds as buttons for keyboard and screen-reader users.
 */
export function Cracks() {
  const group = useRef<Group>(null);
  const clamps = useRef<(Group | null)[]>([]);
  const glows = useRef<(Mesh | null)[]>([]);
  const progress = useRef([0, 0, 0, 0]);
  const metal = useMemo(() => makeMetal("#334638", 0.28), []);
  const glowMats = useMemo(() => [0, 1, 2, 3].map(() => makeGlow()), []);
  const lineMat = useMemo(() => new LineBasicMaterial({ color: C.cream, transparent: true, opacity: 0.85, toneMapped: false }), []);
  const fractures = useMemo(() => [0, 1, 2, 3].map((i) => fractureGeometry(i + 3)), []);
  const plate = useMemo(() => new BoxGeometry(6.4, 1.7, 0.6), []);
  const disc = useMemo(() => new PlaneGeometry(5, 5), []);

  const layout = useMemo(() => {
    const dir = dirAt(PATHS.Yfail, 1, new Vector3());
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
    return CRACK_AT.map((_, i) => ({ point: crackPoint(i), center: crackPoint(i, 0), q }));
  }, []);

  useEffect(
    () => () => {
      metal.dispose();
      glowMats.forEach((m) => m.dispose());
      lineMat.dispose();
      fractures.forEach((g) => g.dispose());
      plate.dispose();
      disc.dispose();
    },
    [metal, glowMats, lineMat, fractures, plate, disc],
  );

  // end a hold anywhere on the page
  useEffect(() => {
    const up = () => {
      if (leak.get().holding >= 0) leak.set({ holding: -1, hold: 0 });
      ui.set({ hold: 0 });
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  useFrame((_, dt) => {
    const L = leak.get();
    const p = gl.get().progress;
    const t = performance.now() / 1000;
    const inLeaks = p > HOME_CHAPTERS.leaks[0] - 0.03 && p < HOME_CHAPTERS.relit[1];

    if (L.holding >= 0 && !L.sealed[L.holding]) {
      const h = Math.min(1, L.hold + dt / HOLD_SECONDS);
      leak.set({ hold: h });
      ui.set({ hold: h });
      if (h >= 1) {
        sealCrack(L.holding);
        sfx.clamp();
        haptic([18, 30, 12]);
        leak.set({ holding: -1, hold: 0 });
        ui.set({ hold: 0 });
      }
    }

    for (let i = 0; i < 4; i++) {
      const target = L.sealed[i] ? 1 : 0;
      progress.current[i] = Math.min(1, Math.max(0, progress.current[i] + (target ? dt * 2.4 : -dt * 4)));
      const k = easeSnap(progress.current[i]);
      const clamp = clamps.current[i];
      if (clamp) {
        clamp.visible = k > 0.001;
        clamp.scale.setScalar(1.55 - 0.55 * k);
        clamp.children.forEach((c) => {
          const mesh = c as Mesh;
          mesh.position.setLength(Math.max(0.001, (3.05 + (1 - k) * 2.4)));
        });
      }
      const glow = glows.current[i];
      if (glow) {
        const holdingThis = L.holding === i ? L.hold : 0;
        const pulse = 0.55 + 0.45 * Math.sin(t * 3 + i);
        glowMats[i].uniforms.uAlpha.value = L.sealed[i] || !inLeaks ? 0 : (0.35 + 0.4 * pulse) * (1 + holdingThis * 1.5);
        glow.scale.setScalar(1 + holdingThis * 0.8);
      }
    }
    if (group.current) group.current.visible = p > HOME_CHAPTERS.flow[0];
  });

  return (
    <group ref={group}>
      {layout.map((c, i) => (
        <group key={i}>
          {/* the fracture on the glass face */}
          <lineSegments geometry={fractures[i]} material={lineMat} position={c.point} />
          {/* the hotspot: a soft glow that answers the pointer */}
          <mesh
            ref={(m) => {
              glows.current[i] = m;
            }}
            geometry={disc}
            material={glowMats[i]}
            position={[c.point.x, c.point.y, c.point.z + 0.05]}
            onPointerOver={(e) => {
              e.stopPropagation();
              if (leak.get().sealed[i]) return;
              ui.set({ glCursor: "hold", glCursorLabel: "Hold to clamp" });
            }}
            onPointerOut={() => ui.set({ glCursor: null, glCursorLabel: "" })}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (leak.get().sealed[i]) return;
              leak.set({ holding: i, hold: 0 });
              haptic(8);
            }}
          />
          {/* the clamp: four brushed plates that close around the duct */}
          <group
            ref={(g) => {
              clamps.current[i] = g;
            }}
            position={c.center}
            quaternion={c.q}
            visible={false}
          >
            {[0, 1, 2, 3].map((side) => {
              const a = (side / 4) * Math.PI * 2;
              return (
                <mesh
                  key={side}
                  geometry={plate}
                  material={metal}
                  position={[Math.cos(a) * 3.05, 0, Math.sin(a) * 3.05]}
                  rotation={[0, -a + Math.PI / 2, 0]}
                />
              );
            })}
          </group>
        </group>
      ))}
    </group>
  );
}
