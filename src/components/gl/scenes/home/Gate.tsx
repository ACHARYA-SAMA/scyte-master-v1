"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gl, useStore } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import { C, lightBlend } from "../../materials";
import { seeded } from "../../random";
import { cine, devOff, ramp, setAt, SHOTS } from "./film";
import { air, makeFloor, makeSky } from "./shaders";

/** The water line, the gate's size, and how far behind it the sky hangs. */
export const FLOOR = 0;
export const GATE = { w: 72, h: 72, bar: 1.1 };
export const GATE_MID = new Vector3(0, GATE.h / 2, 0);
export const SKY_Z = -1500;
/** The gates stand in a line across the water towards the sun, this far apart. */
export const GATES = 9;
export const GATE_GAP = 64;
const CORRIDOR = (GATES - 1) * GATE_GAP;

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`;

/**
 * Where the line reaches each point of a frame, 0..1: from the middle of the sill
 * outwards, up both sides, and closing at the middle of the lintel. `l` is in the
 * frame's own space, sill at y = 0.
 */
const ARRIVAL = /* glsl */ `
  float arrival(vec2 l) {
    float hw = ${(GATE.w / 2).toFixed(2)};
    float x = clamp(abs(l.x) / hw, 0.0, 1.0);
    if (l.y < 3.0) return 0.18 * x;
    if (l.y > ${(GATE.h - 3).toFixed(2)}) return 0.8 + 0.2 * (1.0 - x);
    return 0.18 + 0.62 * clamp(l.y / ${GATE.h.toFixed(2)}, 0.0, 1.0);
  }
`;

/**
 * How far one gate has drawn, and the light running down the line. Each gate starts
 * drawing a beat after the one before it, so the line races away into the haze; once
 * lit, a pulse travels from the nearest gate to the farthest, like approach lights.
 */
const SEQUENCE = /* glsl */ `
  uniform float uDraw;
  uniform float uTime;
  float drawn(float k) { return clamp(uDraw * ${(1 + (GATES - 1) * 0.1).toFixed(2)} - k * 0.1, 0.0, 1.0); }
  float pulse(float k) {
    float front = fract(uTime * 0.16) * ${(GATES + 6).toFixed(1)} - 3.0;
    float d = k - front;
    return exp(-d * d * 0.7);
  }
`;

/** The frames: four bars of pure light per gate, one instanced draw for the whole line. */
const frameMaterial = () =>
  new ShaderMaterial({
    // pure light, added like every other glow: drawn opaque, a surface this bright left a dark ring in the bloom
    transparent: true,
    depthWrite: false,
    ...lightBlend,
    uniforms: {
      ...air,
      uDraw: { value: 1 },
      uFlood: { value: 1 },
      uTime: { value: 0 },
      uLine: { value: C.cream.clone().multiplyScalar(0.9) },
      uLight: { value: new Color(1, 0.93, 0.74) },
      uHead: { value: new Color(1, 0.97, 0.88) },
    },
    vertexShader: /* glsl */ `
      attribute float aK;
      varying vec3 vL;
      varying vec3 vW;
      varying float vK;
      void main() {
        vL = position;
        vK = aK;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uFlood;
      uniform vec3 uLine;
      uniform vec3 uLight;
      uniform vec3 uHead;
      varying vec3 vL;
      varying vec3 vW;
      varying float vK;
      ${ARRIVAL}
      ${SEQUENCE}
      void main() {
        float local = drawn(vK);
        float a = arrival(vL.xy);
        float on = clamp((local - a) / 0.012, 0.0, 1.0);
        float head = exp(-abs(local - a) * 80.0) * step(local, 0.999);
        if (on < 0.001 && head < 0.01) discard;
        // the first gate burns steady; the ones behind it breathe with the passing pulse
        float level = vK < 0.5 ? 1.0 : 0.55 + 0.6 * pulse(vK);
        vec3 col = mix(uLine, uLight * level, uFlood) * on + uHead * head;
        float d = length(cameraPosition - vW) * uFogDensity;
        col *= exp(-d * d * 0.6);
        // white-hot but kept under the bloom threshold: the halo does the glowing, so the
        // bloom never sees a line this bright and never rings it with a dark gap
        gl_FragColor = vec4(min(col, vec3(0.97)), 1.0);
      }
    `,
    toneMapped: false,
  });

/**
 * Each frame's own glow: a soft halo round its bars, below the bloom threshold. Bloom
 * alone leaves a thin dark gap beside a line this bright on integrated GPUs; this
 * fills it, the way a neon tube lights the air around it.
 */
const haloMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    ...lightBlend,
    uniforms: { ...air, uDraw: { value: 1 }, uFlood: { value: 1 }, uTime: { value: 0 }, uColor: { value: C.lumen.clone() } },
    vertexShader: /* glsl */ `
      attribute float aK;
      varying vec2 vP;
      varying vec3 vW;
      varying float vK;
      void main() {
        vP = position.xy;
        vK = aK;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uFlood;
      uniform vec3 uColor;
      varying vec2 vP;
      varying vec3 vW;
      varying float vK;
      ${ARRIVAL}
      ${SEQUENCE}
      void main() {
        vec2 half_ = vec2(${(GATE.w / 2).toFixed(2)}, ${(GATE.h / 2).toFixed(2)});
        vec2 q = abs(vP) - half_;
        // distance to the square the bars draw
        float d = abs(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0));
        float glow = exp(-d * d / 3.0) * 0.75 + exp(-d * d / 26.0) * 0.24 + exp(-d / 6.0) * 0.05;
        // nothing at all by the edge of its own plane
        vec2 room = vec2(${((GATE.w + 40) / 2).toFixed(2)}, ${((GATE.h + 40) / 2).toFixed(2)}) - abs(vP);
        glow *= smoothstep(0.0, 8.0, min(room.x, room.y));
        float on = clamp((drawn(vK) - arrival(vP + vec2(0.0, half_.y))) / 0.03, 0.0, 1.0);
        float level = vK < 0.5 ? 1.0 : 0.5 + 0.7 * pulse(vK);
        float f = length(cameraPosition - vW) * uFogDensity;
        vec3 col = uColor * glow * on * level * (0.35 + 0.65 * uFlood) * exp(-f * f * 0.6);
        gl_FragColor = vec4(min(col, vec3(0.9)), 1.0);
      }
    `,
    toneMapped: false,
  });

/**
 * The light in the first doorway: nearly clear, so the dawn and the line of gates show
 * through it. Light rises from the sun at its foot in fine threads, like a curtain of
 * falling water lit from below, and rings softly where a drop passes through.
 */
const membraneMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    ...lightBlend,
    uniforms: { uTime: { value: 0 }, uLevel: { value: 0 }, uColor: { value: C.lumen.clone() }, uNear: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uTime;
      uniform float uLevel;
      uniform vec3 uColor;
      uniform float uNear;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv;
        float rise = pow(max(0.0, 1.0 - p.y), 2.6);
        // threads: thin vertical lines that waver and run upwards
        float bend = noise(vec2(p.x * 9.0, p.y * 2.0 - uTime * 0.3)) * 4.0;
        float thread = pow(abs(sin(p.x * 140.0 + bend)), 30.0) * (0.4 + 0.6 * noise(vec2(p.x * 60.0, p.y * 3.0 - uTime * 0.6)));
        float haze = noise(p * vec2(4.0, 6.0) + vec2(0.0, -uTime * 0.12));
        float box = max(abs(p.x - 0.5), abs(p.y - 0.5));
        float hug = smoothstep(0.46, 0.5, box);
        float rings = 0.0;
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          float beat = uTime * 0.45 + fi * 0.33;
          float k = floor(beat);
          vec2 c = vec2(0.15 + 0.7 * hash(vec2(k, fi * 7.1)), 0.08 + 0.6 * hash(vec2(fi * 3.3, k)));
          float age = fract(beat);
          float r = (length(p - c) - age * 0.18) * 140.0;
          rings += exp(-r * r) * (1.0 - age) * (1.0 - age);
        }
        float glow = rise * (0.12 + 0.18 * haze + 0.55 * thread) + hug * 0.22 + rings * 0.3 + 0.015;
        // close to the camera the sheet blazes, so flying through it is flying into light
        glow *= 1.0 + uNear * 1.6;
        gl_FragColor = vec4(min(uColor * glow * uLevel, vec3(1.6)), 1.0);
      }
    `,
    toneMapped: false,
  });

/**
 * Shoppers as trails of light, like a long exposure of traffic at night. They gather
 * in rivers over the water from both sides, swing round before the first gate, pour
 * through it and run on down the line of gates towards the sun. Each trail's place on
 * its river comes from the clock, so a few thousand of them cost one draw call.
 */
const trailsMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    ...lightBlend,
    uniforms: {
      ...air,
      uTime: { value: 0 },
      uLevel: { value: 0 },
      uRate: { value: 1 },
      uLen: { value: 3.4 },
      uHot: { value: C.lumen.clone().multiplyScalar(2.4) },
      uCool: { value: C.cream.clone().multiplyScalar(1.8) },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      attribute vec4 aPath;
      uniform float uTime;
      uniform float uRate;
      uniform float uLen;
      varying float vA;
      varying float vTint;
      varying vec2 vUv;
      varying vec3 vW;
      vec3 bez(vec3 a, vec3 b, vec3 c, float t) { float u = 1.0 - t; return u * u * a + 2.0 * u * t * b + t * t * c; }
      vec3 pathAt(float t) {
        vec3 start = aPath.xyz;
        vec3 bend = vec3(start.x * 0.3, 3.0 + aSeed.z * 16.0, 70.0 + aSeed.y * 40.0);
        vec3 enter = vec3((aSeed.y - 0.5) * ${(GATE.w - 10).toFixed(1)}, 5.0 + aSeed.z * ${(GATE.h - 14).toFixed(1)}, 0.0);
        if (t < 0.62) return bez(start, bend, enter, smoothstep(0.0, 0.62, t));
        // on through the line of gates, drawing in towards the middle and the water
        float u = (t - 0.62) / 0.38;
        vec3 deep = vec3(enter.x * 0.3, 6.0 + aSeed.z * 20.0, -${CORRIDOR.toFixed(1)});
        return mix(enter, deep, u);
      }
      void main() {
        float t = fract(aSeed.x + uTime * uRate * (0.03 + aSeed.w * 0.025));
        vec3 w0 = (modelMatrix * vec4(pathAt(t), 1.0)).xyz;
        vec3 w1 = (modelMatrix * vec4(pathAt(min(0.9999, t + 0.004)), 1.0)).xyz;
        vec3 dir = w1 - w0;
        float sp = length(dir);
        vec3 dn = sp > 1e-4 ? dir / sp : vec3(0.0, 0.0, -1.0);
        float len = clamp(sp * uLen, 0.5, 10.0);
        vec3 toCam = normalize(cameraPosition - w0);
        vec3 side = cross(dn, toCam);
        side = length(side) > 1e-4 ? normalize(side) : vec3(1.0, 0.0, 0.0);
        // never thinner than about a pixel, however far away
        float width = max(0.22, length(cameraPosition - w0) * 0.0028) * (0.7 + aSeed.w * 0.6);
        float along = position.y + 0.5;
        vec3 p = w0 - dn * len * (1.0 - along) + side * position.x * width;
        vUv = uv;
        vA = smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.82, t);
        vTint = aPath.w;
        vW = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uLevel;
      uniform vec3 uHot;
      uniform vec3 uCool;
      varying float vA;
      varying float vTint;
      varying vec2 vUv;
      varying vec3 vW;
      void main() {
        float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
        // a bright head and a tail that fades behind it
        float along = pow(vUv.y, 2.2) + smoothstep(0.86, 1.0, vUv.y) * 0.8;
        float a = across * across * along * vA * uLevel;
        float f = length(cameraPosition - vW) * uFogDensity;
        vec3 col = mix(uHot, uCool, vTint) * a * exp(-f * f * 0.7);
        gl_FragColor = vec4(min(col, vec3(1.9)), 1.0);
      }
    `,
    toneMapped: false,
  });

/** Low mist on the water, lit where the gates and the sun's path fall on it. */
const mistMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    ...lightBlend,
    uniforms: { ...air, uTime: { value: 0 }, uGlow: { value: 0 }, uSeed: { value: 0 }, uColor: { value: C.lumen.clone() } },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uFogDensity;
      uniform float uTime;
      uniform float uGlow;
      uniform float uSeed;
      uniform vec3 uColor;
      varying vec3 vW;
      void main() {
        vec2 p = vW.xz + uSeed * 37.0;
        float n = noise(p * 0.011 + vec2(uTime * 0.018, 0.0)) * 0.6 + noise(p * 0.034 - vec2(0.0, uTime * 0.026)) * 0.4;
        float m = smoothstep(0.38, 0.85, n);
        // brightest round the line of gates, and along the path of the sun
        float gates = exp(-length(vec2(vW.x * 0.7, (vW.z + ${(CORRIDOR / 2).toFixed(1)}) * 0.35)) / 110.0);
        float path = exp(-abs(vW.x) / 70.0);
        float d = length(cameraPosition - vW);
        float near = smoothstep(8.0, 70.0, d);
        // ground mist shows edge on; from above it is nothing
        float edgeOn = smoothstep(0.32, 0.06, abs(normalize(cameraPosition - vW).y));
        float f = d * uFogDensity;
        vec3 col = uColor * m * (0.15 + 0.85 * gates + 0.35 * path) * 0.06 * uGlow * near * edgeOn * exp(-f * f * 0.35);
        gl_FragColor = vec4(min(col, vec3(0.6)), 1.0);
      }
    `,
    toneMapped: false,
  });

const RIVERS = 8;
const MIST = [0.8, 2.6, 5.4];

/**
 * The gate: a line of doorways of pure light standing on still water at dawn, the
 * sun low at the far end of them. Every visit is a trail of light: they come in over
 * the water in rivers, pour through the first door and run on down the line. The
 * camera flies in through the doors, and at the end of the film backs out of them.
 */
export function Gate() {
  const quality = useStore(gl, (s) => s.quality);
  const count = quality === 2 ? 2400 : quality === 1 ? 1600 : 800;

  const geo = useMemo(() => {
    const { w, h, bar } = GATE;
    const index = new InstancedBufferAttribute(Float32Array.from({ length: GATES }, (_, k) => k), 1);
    const instanced = (g: BufferGeometry) => {
      g.setAttribute("aK", index);
      return g;
    };
    const frame = instanced(
      mergeGeometries([
        new BoxGeometry(w + bar, bar, bar).translate(0, bar / 2, 0),
        new BoxGeometry(w + bar, bar, bar).translate(0, h, 0),
        new BoxGeometry(bar, h, bar).translate(-w / 2, h / 2, 0),
        new BoxGeometry(bar, h, bar).translate(w / 2, h / 2, 0),
      ]),
    );
    // the halo sits centred on the frame, a little proud of it
    const halo = instanced(new PlaneGeometry(w + 40, h + 40).translate(0, h / 2 + bar / 2, 0.7));

    // the rivers: each has its own side, distance and height, its trails scattered along it
    const rand = seeded(31);
    const rivers = Array.from({ length: RIVERS }, (_, i) => {
      const side = i % 2 ? 1 : -1;
      return { x: side * (130 + rand() * 260), z: -170 + rand() * 300, y: 1.2 + rand() * 6 };
    });
    const trails = new InstancedBufferGeometry();
    const quad = new PlaneGeometry(1, 1);
    trails.index = quad.index;
    trails.setAttribute("position", quad.attributes.position!);
    trails.setAttribute("uv", quad.attributes.uv!);
    const seed = new Float32Array(count * 4);
    const path = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const r = rivers[i % RIVERS]!;
      seed.set([rand(), rand(), rand(), rand()], i * 4);
      path.set([r.x + (rand() - 0.5) * 50, r.y + rand() * 3, r.z + (rand() - 0.5) * 60, rand() < 0.22 ? 1 : 0], i * 4);
    }
    trails.setAttribute("aSeed", new InstancedBufferAttribute(seed, 4));
    trails.setAttribute("aPath", new InstancedBufferAttribute(path, 4));
    trails.instanceCount = count;
    return {
      frame,
      halo,
      trails,
      membrane: new PlaneGeometry(w - bar, h - bar),
      mist: new PlaneGeometry(2400, 1600),
      floor: new PlaneGeometry(6000, 800 - SKY_Z),
      sky: new PlaneGeometry(9000, 3600),
    };
  }, [count]);

  const mats = useMemo(() => {
    const floor = makeFloor();
    floor.uniforms.uRipples!.value = 1;
    return {
      frame: frameMaterial(),
      halo: haloMaterial(),
      membrane: membraneMaterial(),
      trails: trailsMaterial(),
      mist: MIST.map((_, i) => {
        const m = mistMaterial();
        m.uniforms.uSeed!.value = i;
        return m;
      }),
      floor,
      sky: makeSky(FLOOR),
    };
  }, []);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      const { mist, ...rest } = mats;
      Object.values(rest).forEach((m) => m.dispose());
      mist.forEach((m) => m.dispose());
    },
    [geo, mats],
  );

  // one line of gates, receding towards the sun
  const lines = useRef<(InstancedMesh | null)[]>([]);
  useEffect(() => {
    const m = new Matrix4();
    lines.current.forEach((mesh) => {
      if (!mesh) return;
      for (let k = 0; k < GATES; k++) mesh.setMatrixAt(k, m.makeTranslation(0, 0, -k * GATE_GAP));
      mesh.instanceMatrix.needsUpdate = true;
    });
  }, [geo]);

  const root = useRef<Group>(null);

  useFrame((state) => {
    const p = cine.p;
    const on = setAt(p) === "gate";
    if (root.current) root.current.visible = on;
    if (!on) return;
    const reduced = prefersReducedMotion();
    const t = reduced ? 0 : state.clock.elapsedTime;
    const intro = cine.intro;
    const reveal = p >= SHOTS.reveal[0];

    // the opening: a hairline draws the frames one after another, the light floods
    // them, and the sun comes up at the end of the line
    const draw = reveal ? 1 : ramp(intro, 0.02, 0.5);
    const flood = reveal ? 1 : ramp(intro, 0.36, 0.66);
    const dawn = reveal ? 1.15 : ramp(intro, 0.3, 0.9);
    // by the end the sun has climbed, and the rivers run fuller and faster
    const sunY = 16 + 34 * ramp(p, 0.86, 1);

    for (const m of [mats.frame, mats.halo]) {
      m.uniforms.uDraw!.value = draw;
      m.uniforms.uFlood!.value = flood;
      m.uniforms.uTime!.value = t;
    }

    // the first doorway's sheet blazes as the camera passes through it
    const cam = state.camera.position;
    const near = Math.max(0, 1 - Math.abs(cam.z) / 45) * (Math.abs(cam.x) < GATE.w / 2 && cam.y < GATE.h ? 1 : 0);
    const mu = mats.membrane.uniforms;
    mu.uTime!.value = t;
    mu.uLevel!.value = flood * (reveal ? 1.2 : 0.9 + 0.4 * ramp(p, 0.08, 0.16));
    mu.uNear!.value = near;

    const tu = mats.trails.uniforms;
    tu.uTime!.value = t;
    tu.uLevel!.value = ramp(intro, 0.45, 0.95) * (reveal ? 1.25 : 1);
    tu.uRate!.value = reveal ? 1.5 : 1;

    mats.mist.forEach((m) => {
      m.uniforms.uTime!.value = t;
      m.uniforms.uGlow!.value = dawn;
    });

    const su = mats.sky.uniforms;
    su.uGlow!.value = dawn;
    su.uTime!.value = t;
    (su.uSunAt!.value as number[])[1] = sunY;
    const fl = mats.floor.uniforms;
    fl.uGlow!.value = dawn;
    fl.uTime!.value = t;
    (fl.uSunAt!.value as Vector3).set(0, sunY, SKY_Z);
  });

  const lit = (mirror: boolean) => (
    <>
      {devOff("frame") ? null : (
        <instancedMesh ref={(m) => void (lines.current[mirror ? 0 : 1] = m)} args={[geo.frame, mats.frame, GATES]} frustumCulled={false} renderOrder={3} />
      )}
      <instancedMesh ref={(m) => void (lines.current[mirror ? 2 : 3] = m)} args={[geo.halo, mats.halo, GATES]} frustumCulled={false} renderOrder={3} />
      {devOff("membrane") ? null : <mesh geometry={geo.membrane} material={mats.membrane} position={[0, GATE.h / 2 + GATE.bar / 2, 0]} renderOrder={4} />}
      {devOff("drops") ? null : <mesh geometry={geo.trails} material={mats.trails} frustumCulled={false} renderOrder={5} />}
    </>
  );

  return (
    <group ref={root}>
      <mesh visible={!devOff("sky")} geometry={geo.sky} material={mats.sky} position={[0, FLOOR + 1600, SKY_Z]} renderOrder={-3} />
      {/* the reflection: the same light, upside down under the water */}
      {devOff("mirror") ? null : <group scale={[1, -1, 1]}>{lit(true)}</group>}
      <mesh visible={!devOff("floor")} geometry={geo.floor} material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR, (800 + SKY_Z) / 2]} renderOrder={1} />
      {MIST.map((y, i) => (
        <mesh key={y} geometry={geo.mist} material={mats.mist[i]} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR + y, -CORRIDOR / 2]} renderOrder={2} />
      ))}
      {lit(false)}
    </group>
  );
}
