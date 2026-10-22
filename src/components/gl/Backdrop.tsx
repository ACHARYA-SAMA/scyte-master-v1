"use client";

import { useEffect, useMemo } from "react";
import { ShaderMaterial } from "three";
import { C } from "./materials";

/**
 * The studio wall: a dark plane ruled on the logo's own 5-unit grid. Glass in front of
 * it bends the lines, which is what makes clear glass readable at all.
 */
export function Backdrop({ z = -60, size = 900, cell = 5 }: { z?: number; size?: number; cell?: number }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uCell: { value: cell },
          uLine: { value: C.line.clone() },
          uMajor: { value: C.khaki.clone() },
          uBase: { value: C.groundDeep.clone() },
          uDeep: { value: C.abyss.clone() },
        },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vP = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uCell;
          uniform vec3 uLine;
          uniform vec3 uMajor;
          uniform vec3 uBase;
          uniform vec3 uDeep;
          varying vec2 vP;
          varying vec2 vUv;
          float grid(vec2 p, float s, float w) {
            vec2 g = abs(fract(p / s - 0.5) - 0.5) * s;
            vec2 aa = fwidth(p) * 1.2;
            vec2 l = 1.0 - smoothstep(vec2(w) - aa, vec2(w) + aa, g);
            return max(l.x, l.y);
          }
          void main() {
            float r = length(vUv - 0.5) * 2.0;
            vec3 col = mix(uBase, uDeep, smoothstep(0.05, 0.95, r));
            float minor = grid(vP, uCell, 0.05);
            float major = grid(vP, uCell * 5.0, 0.08);
            float fade = 1.0 - smoothstep(0.15, 0.9, r);
            col = mix(col, uLine, minor * 0.55 * fade);
            col = mix(col, uMajor * 0.55, major * 0.35 * fade);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
        toneMapped: false,
        fog: false,
      }),
    [cell],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh position={[0, 0, z]} material={material} renderOrder={-1}>
      <planeGeometry args={[size, size * 0.66]} />
    </mesh>
  );
}
