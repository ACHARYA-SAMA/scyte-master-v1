"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Color, Mesh, PlaneGeometry, RingGeometry, ShaderMaterial, Vector3, type CurvePath } from "three";
import { gl, useStore } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import { junction } from "@/lib/junction";
import { Dust } from "../../Dust";
import { C, lightBlend } from "../../materials";
import { makeSky } from "../home/shaders";
import { ANG, PORTAL, portalCenter } from "./layout";

const SKY_Z = -480;
const NEAR = 60;
const FAR = 330;

/** The junction's water: wet stone with the logo's grid faintly ruled in it, lit where you are headed. */
const floorMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uCharge: { value: 0 },
      uGlow: { value: 0.6 },
      uHot: { value: new Vector3() },
      uSunAt: { value: new Vector3(0, 30, SKY_Z) },
      uFog: { value: new Color("#070e09") },
      uBand: { value: new Color("#17160d") },
      uLumen: { value: C.lumen.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uCharge;
      uniform float uGlow;
      uniform vec3 uHot;
      uniform vec3 uSunAt;
      uniform vec3 uFog;
      uniform vec3 uBand;
      uniform vec3 uLumen;
      varying vec3 vW;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      // analytic grid lines: one screen pixel wide at any distance
      float grid(vec2 p, float size) {
        vec2 q = p / size;
        vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main() {
        vec2 p = vW.xz;
        vec3 V = normalize(cameraPosition - vW);
        float graze = 1.0 - clamp(V.y, 0.0, 1.0);
        float dist = length(cameraPosition - vW);
        float f = clamp((dist - ${NEAR.toFixed(1)}) / ${(FAR - NEAR).toFixed(1)}, 0.0, 1.0);
        float wet = noise(p * 0.018) * 0.7 + noise(p * 0.07) * 0.3;
        float refl = mix(0.1, 0.44, smoothstep(0.5, 0.97, graze)) * mix(0.7, 1.0, smoothstep(0.3, 0.75, wet));
        vec3 col = vec3(0.006, 0.011, 0.008) * (0.85 + 0.3 * wet);
        float fade = exp(-length(p) / 95.0);
        col += vec3(0.2, 0.27, 0.22) * grid(p, 4.0) * 0.04 * fade;
        col += vec3(0.76, 0.72, 0.59) * grid(p, 20.0) * 0.065 * fade;
        // light pooled before the chosen portal, and at the hub where you stand
        col += uLumen * (0.025 + uCharge * 0.16) * exp(-length(p - uHot.xz) / 15.0);
        col += uLumen * 0.04 * exp(-length(p) / 9.0);
        col = mix(col, uFog, f);
        col += uBand * uGlow * f * f * 0.6;
        // the path of light across the water, from the glow behind the chosen portal
        vec3 R = reflect(-V, vec3(0.0, 1.0, 0.0));
        vec3 S = normalize(uSunAt - vW);
        float path = exp(-(1.0 - dot(R, S)) * 260.0);
        float glint = smoothstep(0.6, 0.92, noise(vec2(p.x * 2.4, p.y * 0.4 + uTime * 0.9)));
        col += uLumen * uGlow * path * (0.05 + glint * 1.1) * (1.0 - f * 0.4);
        float a = mix(1.0 - refl, 1.0, f * 0.8);
        gl_FragColor = vec4(col, a);
      }
    `,
  });

/** A shaft of light standing on the chosen portal, up into the haze. */
const beamMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    ...lightBlend,
    uniforms: { uTime: { value: 0 }, uLevel: { value: 0 }, uColor: { value: C.lumen.clone().multiplyScalar(1.6) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uLevel;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
        float core = pow(max(across, 0.0), 6.0) * 1.6 + pow(max(across, 0.0), 2.0) * 0.35;
        float rise = pow(max(0.0, 1.0 - vUv.y), 1.5) * smoothstep(0.0, 0.04, vUv.y);
        float shimmer = 0.8 + 0.2 * sin(vUv.y * 40.0 - uTime * 3.0);
        gl_FragColor = vec4(min(uColor * core * rise * shimmer * uLevel, vec3(1.9)), 1.0);
      }
    `,
    toneMapped: false,
  });

/** A soft round glow, billboarded by the caller. */
const glowMaterial = (color: Color) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    ...lightBlend,
    uniforms: { uColor: { value: color }, uAlpha: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uAlpha;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.6);
        gl_FragColor = vec4(min(uColor * a * uAlpha, vec3(1.9)), 1.0);
      }
    `,
    toneMapped: false,
  });

/**
 * The compass at your feet: a dial ruled every five degrees, a long tick for each of
 * the six paths, a needle on the chosen one, and an arc of light that closes around
 * the dial as the pipe fills.
 */
const compassMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    ...lightBlend,
    uniforms: {
      uAng: { value: [...ANG] },
      uHi: { value: 0 },
      uHere: { value: -1 },
      uCharge: { value: 0 },
      uTime: { value: 0 },
      uKhaki: { value: C.khaki.clone() },
      uLumen: { value: C.lumen.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      #define PI 3.14159265
      uniform float uAng[6];
      uniform float uHi;
      uniform float uHere;
      uniform float uCharge;
      uniform float uTime;
      uniform vec3 uKhaki;
      uniform vec3 uLumen;
      varying vec2 vP;
      float ring(float r, float at, float w) {
        float d = abs(r - at);
        return 1.0 - smoothstep(w, w + fwidth(r) * 1.5, d);
      }
      float spoke(float a, float target, float r, float w) {
        float d = abs(mod(a - target + PI, 2.0 * PI) - PI) * r;
        return 1.0 - smoothstep(w, w + fwidth(d) * 1.5 + 0.001, d);
      }
      void main() {
        float r = length(vP);
        float a = atan(vP.x, vP.y);
        vec3 col = uKhaki * 0.14 * (ring(r, 7.0, 0.025) + ring(r, 4.0, 0.02) + ring(r, 7.45, 0.012) * 0.6);
        // minor ticks every five degrees
        float step5 = PI / 36.0;
        float da = (fract(a / step5 + 0.5) - 0.5) * step5 * r;
        float minor = (1.0 - smoothstep(0.025, 0.025 + fwidth(da) * 1.5, abs(da))) * step(6.55, r) * step(r, 7.0);
        col += uKhaki * 0.1 * minor;
        // a long tick for every path; the chosen one in light, with its needle
        for (int i = 0; i < 6; i++) {
          float fi = float(i);
          float on = 1.0 - step(0.5, abs(fi - uHi));
          float here = 1.0 - step(0.5, abs(fi - uHere));
          float band = step(5.9, r) * step(r, 7.45);
          col += mix(uKhaki * 0.3, uLumen * 1.6, on) * spoke(a, uAng[i], r, 0.05) * band * (1.0 - here * 0.6);
          col += uLumen * 1.1 * on * spoke(a, uAng[i], r, 0.04) * step(4.0, r) * step(r, 5.8);
        }
        // the charge: an arc of light closing around the dial from the chosen path
        float hiAng = uAng[int(uHi + 0.5)];
        float rel = mod(a - hiAng + 2.0 * PI, 2.0 * PI);
        float arc = step(rel, uCharge * 2.0 * PI) * step(7.12, r) * step(r, 7.34);
        col += uLumen * 1.8 * arc * step(0.002, uCharge);
        // a slow sweep, so the dial is alive while you choose
        float sweep = exp(-mod(a - uTime * 0.6, 2.0 * PI) * 2.5) * step(4.0, r) * step(r, 7.0);
        col += uKhaki * 0.04 * sweep;
        gl_FragColor = vec4(min(col, vec3(1.9)), 1.0);
      }
    `,
    toneMapped: false,
  });

/** Drops of light running down the chosen pipe; they run faster as it fills. */
const flowMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    ...lightBlend,
    uniforms: { uPx: { value: 600 }, uColor: { value: C.lumen.clone().multiplyScalar(3) } },
    vertexShader: /* glsl */ `
      attribute float aLife;
      uniform float uPx;
      varying float vLife;
      void main() {
        vLife = aLife;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(40.0, 1.1 * uPx / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vLife;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.0) * vLife;
        gl_FragColor = vec4(min(uColor * a, vec3(1.9)), 1.0);
      }
    `,
    toneMapped: false,
  });

const FLOW = 56;

/**
 * J1's atmosphere: the junction stands on the same water at the same dawn as the home
 * film. The page you are steering towards glows behind its portal like a low sun, a
 * shaft of light stands on it, a path of light crosses the water to it, and drops of
 * light run down its pipe, faster as you fill it.
 */
export function Atmosphere({ pipes }: { pipes: { curve: CurvePath<Vector3> }[] }) {
  const quality = useStore(gl, (s) => s.quality);
  const mats = useMemo(() => {
    const sky = makeSky(0);
    // a darker dawn than the home film's: the light here belongs to the path you choose
    sky.uniforms.uBand!.value = new Color("#17160d");
    sky.uniforms.uLow!.value = new Color("#060b08");
    sky.uniforms.uSun!.value = C.lumen.clone().multiplyScalar(0.55);
    sky.uniforms.uGlow!.value = 0.4;
    return { sky, floor: floorMaterial(), beam: beamMaterial(), halo: glowMaterial(C.lumen.clone().multiplyScalar(1.4)), compass: compassMaterial(), flow: flowMaterial() };
  }, []);
  const geo = useMemo(() => {
    const flow = new BufferGeometry();
    flow.setAttribute("position", new BufferAttribute(new Float32Array(FLOW * 3), 3));
    flow.setAttribute("aLife", new BufferAttribute(new Float32Array(FLOW), 1));
    return {
      sky: new PlaneGeometry(2600, 1000),
      floor: new PlaneGeometry(1800, 60 - SKY_Z),
      beam: new PlaneGeometry(1, 1).translate(0, 0.5, 0),
      glow: new PlaneGeometry(1, 1),
      compass: new RingGeometry(3.7, 7.6, 240, 1),
      flow,
    };
  }, []);
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
      Object.values(geo).forEach((g) => g.dispose());
    },
    [mats, geo],
  );

  const beam = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const st = useMemo(() => ({ x: 0, z: -60, level: 0, phases: Array.from({ length: FLOW }, (_, i) => i / FLOW), sun: new Vector3(), a: new Vector3() }), []);

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const reduced = prefersReducedMotion();
    const t = reduced ? 0 : state.clock.elapsedTime;
    const s = junction.get();
    const travel = s.phase === "travel" && s.target >= 0;
    const chosen = travel ? s.target : s.hi;
    const isHere = chosen === s.here;
    const k = travel ? 1 : s.charge;
    const cam = state.camera.position;

    // the chosen portal: where the light stands, eased as you steer
    const pc = portalCenter(chosen);
    const ease = Math.min(1, dt * 7);
    st.x += (pc.x - st.x) * ease;
    st.z += (pc.z - st.z) * ease;
    const level = isHere ? 0.1 : 0.32 + k * 1.3;
    st.level += (level - st.level) * Math.min(1, dt * 5);

    // the sun sits on the sky right behind the chosen portal, as seen from the camera
    const span = (SKY_Z - cam.z) / Math.min(-1, st.z - cam.z);
    st.sun.set(cam.x + (st.x - cam.x) * span, Math.max(14, cam.y + (pc.y - 2 - cam.y) * span), SKY_Z);
    const sky = mats.sky.uniforms;
    (sky.uSunAt!.value as number[])[0] = st.sun.x;
    (sky.uSunAt!.value as number[])[1] = st.sun.y;
    sky.uGlow!.value = 0.32 + st.level * 0.38;
    sky.uHot!.value = 0.3 + k * 0.9;
    sky.uTime!.value = t;

    const fl = mats.floor.uniforms;
    fl.uTime!.value = t;
    fl.uCharge!.value = isHere ? 0 : k;
    fl.uGlow!.value = 0.35 + st.level * 0.45;
    (fl.uHot!.value as Vector3).set(st.x, 0, st.z);
    (fl.uSunAt!.value as Vector3).copy(st.sun);

    const b = beam.current;
    if (b) {
      b.position.set(st.x, PORTAL.base + PORTAL.h + 0.8, st.z);
      b.rotation.set(0, Math.atan2(cam.x - st.x, cam.z - st.z), 0);
      b.scale.set(6 + k * 8, 150, 1);
      mats.beam.uniforms.uLevel!.value = isHere ? 0 : 0.18 + k * 1.2;
      mats.beam.uniforms.uTime!.value = t;
    }
    const h = halo.current;
    if (h) {
      h.position.set(st.x, pc.y, st.z).addScaledVector(st.a.set(st.x, 0, st.z).normalize(), 2.5);
      h.quaternion.copy(state.camera.quaternion);
      h.scale.setScalar(34 + k * 30);
      mats.halo.uniforms.uAlpha!.value = isHere ? 0 : 0.1 + k * 0.6;
    }

    const cu = mats.compass.uniforms;
    cu.uHi!.value = chosen;
    cu.uHere!.value = s.here;
    cu.uCharge!.value = isHere ? 0 : k;
    cu.uTime!.value = t;

    // drops down the chosen pipe
    const pipe = pipes[chosen];
    const pos = geo.flow.attributes.position as BufferAttribute;
    const life = geo.flow.attributes.aLife as BufferAttribute;
    const speed = reduced ? 0 : travel ? 1.4 : 0.07 + k * 0.85;
    st.phases.forEach((ph, i) => {
      const next = (ph + dt * speed * (0.85 + (i % 5) * 0.06)) % 1;
      st.phases[i] = next;
      if (!pipe || isHere) {
        life.setX(i, 0);
        return;
      }
      pipe.curve.getPointAt(next, st.a);
      pos.setXYZ(i, st.a.x, st.a.y + 0.05, st.a.z);
      // dense near the hub at rest; the whole pipe runs as it fills
      const reach = 0.35 + k * 0.65;
      life.setX(i, next < reach ? (1 - next / Math.max(0.01, reach)) * 0.6 + 0.4 * k : 0);
    });
    pos.needsUpdate = true;
    life.needsUpdate = true;
    mats.flow.uniforms.uPx!.value = state.size.height * state.viewport.dpr * 0.5;
  });

  return (
    <group>
      <mesh geometry={geo.sky} material={mats.sky} position={[0, 440, SKY_Z]} renderOrder={-3} />
      <mesh geometry={geo.floor} material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (60 + SKY_Z) / 2]} renderOrder={-1} />
      <mesh geometry={geo.compass} material={mats.compass} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} renderOrder={2} />
      <mesh ref={halo} geometry={geo.glow} material={mats.halo} renderOrder={1} />
      <mesh ref={beam} geometry={geo.beam} material={mats.beam} renderOrder={6} />
      <points geometry={geo.flow} material={mats.flow} frustumCulled={false} renderOrder={7} />
      <Dust count={quality === 2 ? 900 : quality === 1 ? 600 : 300} box={110} gain={0.7} />
    </group>
  );
}
