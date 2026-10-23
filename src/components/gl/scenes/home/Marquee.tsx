"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh } from "three";
import { gl, useStore } from "@/lib/store";
import { DEPTH } from "@/lib/logo/three";
import { BulbString, bulbsAlong } from "../../BulbString";
import { PATHS, type PathId } from "./paths";
import { HOME_CHAPTERS, leak } from "./leak";

/** The letters' strokes, left to right: the order the sign lights in. */
const LINES: PathId[] = ["S", "C", "Ystem", "Ypaid", "Yfail", "T", "Espine", "Etop", "Emid", "Ebottom"];
/** Just under the logo's baseline (cap height 37, centred on 0). */
export const FLOOR_Y = -22;

/**
 * The finale's sign: marquee bulbs on the face of every letter, along the strokes'
 * own centrelines, so at rest the logo's silhouette is untouched. They mount as the
 * last chapter arrives and light in sequence on the ignition; a dark glossy floor
 * below catches their reflection.
 */
export function Marquee() {
  const bulbs = useMemo(() => bulbsAlong(LINES.map((id) => PATHS[id].pts), 3.3, DEPTH / 2), []);
  const ignition = useStore(leak, (s) => s.ignition);
  const ignite = useStore(leak, (s) => s.ignite);
  const [mount, setMount] = useState(0);
  const floor = useRef<Mesh>(null);
  const last = useRef(0);

  useFrame(() => {
    const p = gl.get().progress;
    const [a] = HOME_CHAPTERS.studio;
    const m = Math.min(1, Math.max(0, (p - (a - 0.02)) / 0.035));
    // React only hears about the mount in steps; the bulbs animate on their own clock
    const q = Math.round(m * 40) / 40;
    if (q !== last.current) {
      last.current = q;
      setMount(q);
    }
    if (floor.current) floor.current.visible = p > a - 0.03;
  });

  return (
    <group>
      <BulbString bulbs={bulbs} mount={mount} ignite={ignite} on={ignition} floorY={FLOOR_Y} />
      <mesh ref={floor} position={[0, FLOOR_Y - 0.01, -10]} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={0}>
        <planeGeometry args={[420, 140]} />
        <meshStandardMaterial color="#0b140d" roughness={0.3} metalness={0.6} transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </group>
  );
}
