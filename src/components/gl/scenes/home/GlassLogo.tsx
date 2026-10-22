"use client";

import { useEffect, useMemo } from "react";
import { ExtrudeGeometry } from "three";
import { glyphShapes, DEPTH } from "@/lib/logo/three";
import { makeGlass } from "../../materials";

/**
 * The wordmark as green glass: every glyph's exact outline extruded 5 units deep, so
 * each 5-unit stroke becomes a square duct. A small bevel catches the softboxes.
 */
export function GlassLogo() {
  const geometries = useMemo(
    () =>
      glyphShapes().map((shape) => {
        const g = new ExtrudeGeometry(shape, {
          depth: DEPTH,
          bevelEnabled: true,
          bevelThickness: 0.32,
          bevelSize: 0.18,
          bevelOffset: -0.18,
          bevelSegments: 3,
          curveSegments: 1,
        });
        g.translate(0, 0, -DEPTH / 2);
        g.computeVertexNormals();
        return g;
      }),
    [],
  );
  const material = useMemo(() => makeGlass({ thickness: 4.2, roughness: 0.07 }), []);

  useEffect(
    () => () => {
      geometries.forEach((g) => g.dispose());
      material.dispose();
    },
    [geometries, material],
  );

  return (
    <group>
      {geometries.map((g, i) => (
        <mesh key={i} geometry={g} material={material} renderOrder={2} />
      ))}
    </group>
  );
}
