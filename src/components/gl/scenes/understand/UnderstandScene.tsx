"use client";
/* eslint-disable react-hooks/immutability -- geometry and materials are created once and updated every frame inside useFrame. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BufferAttribute, Mesh, PerspectiveCamera, PlaneGeometry, ShaderMaterial, Vector3, MeshPhysicalMaterial, Color } from "three";
import { gl } from "@/lib/store";
import { SIGNALS, THRESHOLD, contributions, decay, intent, score } from "@/lib/intent";
import { prefersReducedMotion } from "@/lib/motion";
import { Studio } from "../../Studio";
import { Post } from "../../Post";
import { C } from "../../materials";
import { projectAnchors } from "../../anchors";

const SIZE = 110;
const SEG = 150;
const K = 0.24; // world units per score point
const RING = 24;

/** Other shoppers in the store right now: small hills that rise and fall (seeded). */
const CROWD = Array.from({ length: 30 }, (_, i) => {
  const a = i * 2.399;
  const r = 30 + ((i * 37) % 23);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r * 0.8, amp: 0.25 + ((i * 53) % 11) / 14, speed: 0.15 + ((i * 17) % 7) / 30, phase: i * 1.7 };
});

const terrainMaterial = () =>
  new ShaderMaterial({
    uniforms: {
      uThreshold: { value: THRESHOLD * K },
      uStep: { value: 10 * K },
      uLow: { value: C.groundDeep.clone() },
      uMid: { value: C.raised.clone() },
      uHigh: { value: C.khaki.clone() },
      uLine: { value: C.khaki.clone() },
      uLumen: { value: C.lumen.clone().multiplyScalar(2.2) },
      uLight: { value: new Vector3(0.4, 0.85, 0.35).normalize() },
    },
    vertexShader: /* glsl */ `
      varying float vH;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vH = position.y;
        vN = normalize(normalMatrix * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uThreshold;
      uniform float uStep;
      uniform vec3 uLow, uMid, uHigh, uLine, uLumen, uLight;
      varying float vH;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        float t = clamp(vH / uThreshold, 0.0, 1.0);
        vec3 base = mix(uLow, uMid, smoothstep(0.0, 0.45, t));
        base = mix(base, uHigh * 0.7, smoothstep(0.45, 1.0, t));
        float diff = max(0.0, dot(normalize(vN), uLight));
        vec3 col = base * (0.35 + 0.75 * diff);
        // contour every ten points, drawn at constant width on screen
        float c = vH / uStep;
        float w = fwidth(c);
        float line = 1.0 - smoothstep(0.0, w * 1.3, abs(fract(c - 0.5) - 0.5));
        col = mix(col, uLine, line * 0.5 * smoothstep(0.02, 0.2, vH));
        // above the threshold, the surface is lit
        float over = smoothstep(uThreshold - 0.05, uThreshold + 0.4, vH);
        col = mix(col, uLumen, over * 0.85);
        // the threshold contour itself
        float tl = 1.0 - smoothstep(0.0, fwidth(vH) * 2.0, abs(vH - uThreshold));
        col = mix(col, uLumen, tl);
        // fade the edge of the field into the dark
        float edge = smoothstep(${(SIZE / 2).toFixed(1)}, ${(SIZE / 2 - 14).toFixed(1)}, length(vW.xz));
        col = mix(vec3(0.035, 0.07, 0.045), col, edge);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

export default function UnderstandScene() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(SIZE, SIZE, SEG, SEG);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const material = useMemo(() => terrainMaterial(), []);
  const glass = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: new Color("#e6d5b8"),
        transmission: 0.92,
        roughness: 0.15,
        thickness: 0.3,
        transparent: true,
        opacity: 0.35,
        envMapIntensity: 1.2,
        depthWrite: false,
      }),
    [],
  );
  const mesh = useRef<Mesh>(null);
  const base = useMemo(() => Float32Array.from(geometry.attributes.position.array as Float32Array), [geometry]);
  const peaks = useRef({ center: 0, signals: SIGNALS.map(() => 0) });
  const anchors = useMemo(
    () => ({ aarav: new Vector3(), ...Object.fromEntries(SIGNALS.map((s) => [`sig-${s.key}`, new Vector3()])) }) as Record<string, Vector3>,
    [],
  );
  const cam = useRef({ pos: new Vector3(0, 60, 90), look: new Vector3(), ready: false });

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      glass.dispose();
    },
    [geometry, material, glass],
  );

  useFrame((_, dt) => {
    const t = performance.now() / 1000;
    const inputs = intent.get();
    const c = contributions(inputs);
    const d = decay(inputs.hoursSince);
    const k = Math.min(1, dt * 4);
    // ease every hill towards its target so changes grow rather than jump
    peaks.current.center += (score(inputs) * K - peaks.current.center) * k;
    SIGNALS.forEach((s, i) => {
      peaks.current.signals[i] += (c[s.key] * d * K * 1.4 - peaks.current.signals[i]) * k;
    });
    const pos = geometry.attributes.position as BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let v = 0; v < arr.length; v += 3) {
      const x = base[v];
      const z = base[v + 2];
      const r2 = x * x + z * z;
      let h = r2 < 900 ? peaks.current.center * Math.exp(-r2 / (2 * 8.5 * 8.5)) : 0;
      SIGNALS.forEach((_, i) => {
        const a = (i / SIGNALS.length) * Math.PI * 2 - Math.PI / 2;
        const sx = Math.cos(a) * RING;
        const sz = Math.sin(a) * RING * 0.85;
        const dx = x - sx;
        const dz = z - sz;
        const d2 = dx * dx + dz * dz;
        if (d2 < 200) h += peaks.current.signals[i] * Math.exp(-d2 / (2 * 4.6 * 4.6));
      });
      for (const p of CROWD) {
        const dx = x - p.x;
        const dz = z - p.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > 110) continue;
        const amp = p.amp * (0.5 + 0.5 * Math.sin(t * p.speed + p.phase)) * THRESHOLD * K * 1.05;
        h += amp * Math.exp(-d2 / (2 * 3.4 * 3.4));
      }
      arr[v + 1] = h;
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();

    anchors.aarav.set(0, peaks.current.center + 1.5, 0);
    SIGNALS.forEach((s, i) => {
      const a = (i / SIGNALS.length) * Math.PI * 2 - Math.PI / 2;
      anchors[`sig-${s.key}`].set(Math.cos(a) * RING, peaks.current.signals[i] + 1, Math.sin(a) * RING * 0.85);
    });

    // camera: an elevated three-quarter view that slowly circles
    const s = gl.get();
    const orbit = prefersReducedMotion() ? 0.5 : 0.5 + Math.sin(t * 0.05) * 0.25 + s.progress * 0.6;
    const R = 92;
    const want = new Vector3(Math.cos(orbit) * R * 0.75 + s.px * 4, 48 + s.py * 3, Math.sin(orbit) * R);
    const look = new Vector3(-10, 6, 0);
    const aspect = size.width / size.height;
    if (aspect < 1.2) want.sub(look).multiplyScalar(Math.min(2, 1.35 / aspect)).add(look);
    const cr = cam.current;
    if (!cr.ready) {
      cr.pos.copy(want);
      cr.look.copy(look);
      cr.ready = true;
    } else {
      const kk = 1 - Math.exp(-dt * 3);
      cr.pos.lerp(want, kk);
      cr.look.lerp(look, kk);
    }
    camera.position.copy(cr.pos);
    camera.lookAt(cr.look);
    projectAnchors(camera, anchors, size.width, size.height);
  });

  return (
    <>
      <color attach="background" args={["#09120b"]} />
      <fog attach="fog" args={["#09120b", 90, 260]} />
      <Studio intensity={0.9} />
      <mesh ref={mesh} geometry={geometry} material={material} />
      {/* the threshold: a sheet of glass at the score worth a message */}
      <mesh position={[0, THRESHOLD * K, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glass} renderOrder={3}>
        <circleGeometry args={[SIZE * 0.42, 96]} />
      </mesh>
      <Post bloom={0.85} threshold={0.86} />
    </>
  );
}
