"use client";

import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { MeshBasicMaterial } from "three";
import { canvasTexture, makeMetal } from "../../materials";
import { STORE_H, STORE_W, drawStore } from "../../storeCanvas";
import { STORE } from "./paths";

/**
 * A generic laptop showing a fictional store, where the drops come from. Brushed
 * dark metal, no brand marks.
 */
export function Storefront() {
  const metal = useMemo(() => makeMetal("#253026", 0.3), []);
  const screen = useMemo(() => new MeshBasicMaterial({ map: canvasTexture(STORE_W, STORE_H, drawStore), toneMapped: false }), []);
  useEffect(
    () => () => {
      metal.dispose();
      screen.map?.dispose();
      screen.dispose();
    },
    [metal, screen],
  );
  const { position } = STORE;
  return (
    <group position={position} rotation={[0.08, 0.32, 0]}>
      {/* lid */}
      <group position={[0, 1.6, 0]} rotation={[-0.16, 0, 0]}>
        <RoundedBox args={[24, 15.4, 0.7]} radius={0.5} smoothness={4} position={[0, 7.7, -0.35]} material={metal} />
        <mesh position={[0, 7.7, 0.02]} material={screen}>
          <planeGeometry args={[22.6, 14.1]} />
        </mesh>
      </group>
      {/* base */}
      <RoundedBox args={[25, 1.1, 16]} radius={0.45} smoothness={4} position={[0, 0.9, 7.6]} material={metal} />
    </group>
  );
}
