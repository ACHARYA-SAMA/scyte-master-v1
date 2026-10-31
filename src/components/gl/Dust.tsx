"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, ShaderMaterial, type Color } from "three";
import { prefersReducedMotion } from "@/lib/motion";
import { C, lightBlend } from "./materials";
import { seeded } from "./random";

/**
 * Dust in the air, catching the light. The motes live in a box that wraps around the
 * camera, so there is always air in front of the lens wherever it flies; near motes
 * grow soft and dim like out-of-focus specks, far ones are pinpoints.
 */
export function Dust({ count = 1200, box = 90, color = C.cream, gain = 1, drift = 1 }: { count?: number; box?: number; color?: Color; gain?: number; drift?: number }) {
  const size = useThree((s) => s.size);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const rand = seeded(count);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < seed.length; i++) seed[i] = rand();
    g.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aSeed", new BufferAttribute(seed, 4));
    g.boundingSphere = null;
    return g;
  }, [count]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        ...lightBlend,
        uniforms: {
          uTime: { value: 0 },
          uBox: { value: box },
          uPx: { value: 600 },
          uColor: { value: color.clone().multiplyScalar(0.9) },
          uGain: { value: gain },
        },
        vertexShader: /* glsl */ `
          attribute vec4 aSeed;
          uniform float uTime;
          uniform float uBox;
          uniform float uPx;
          varying float vA;
          void main() {
            vec3 drift = vec3(sin(uTime * 0.07 + aSeed.w * 6.28) * 2.0, uTime * (0.25 + aSeed.w * 0.5), cos(uTime * 0.05 + aSeed.x * 6.28) * 2.0);
            vec3 local = aSeed.xyz * uBox + drift;
            // wrap the box around the camera
            vec3 p = cameraPosition + mod(local - cameraPosition, uBox) - uBox * 0.5;
            vec4 mv = viewMatrix * vec4(p, 1.0);
            float d = -mv.z;
            float s = (0.5 + aSeed.w * 1.2) * uPx / max(d, 0.5);
            gl_PointSize = clamp(s, 1.0, 14.0);
            // near motes are big and soft, so dim them; the box edges fade out
            float edge = 1.0 - smoothstep(0.32, 0.5, max(max(abs(p.x - cameraPosition.x), abs(p.y - cameraPosition.y)), abs(p.z - cameraPosition.z)) / uBox);
            vA = edge * smoothstep(1.5, 8.0, d) * (0.35 + 0.65 * fract(aSeed.y * 13.0 + uTime * 0.15 * aSeed.z));
            vA *= 1.0 / (1.0 + s * 0.06);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uGain;
          varying float vA;
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            float a = pow(max(0.0, 1.0 - d), 1.6) * vA * uGain;
            gl_FragColor = vec4(uColor * a, 1.0);
          }
        `,
        toneMapped: false,
      }),
    [box, color, gain],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame((state) => {
    material.uniforms.uTime!.value = prefersReducedMotion() ? 0 : state.clock.elapsedTime * drift;
    // point sizes are in device pixels
    material.uniforms.uPx!.value = size.height * 0.5 * state.viewport.dpr;
  });
  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}
