"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gl, useStore } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import { C, lightBlend } from "../../materials";
import { seeded } from "../../random";
import { cine, ramp, REASONS, sealAt, setAt, SHOTS } from "./film";
import { air, makeCore, makeEmbers, makeGlow, makeRib, makeShell, makeSign } from "./shaders";
import { reasonSign } from "./signs";

/**
 * The fork is the Y of the wordmark, grown to the size of a building: the stem rises
 * out of the dark, the right arm pays, the left arm fails. Directions are the glyph's own.
 */
const UP_LEFT = new Vector3(-8.9, 15.3, 0).normalize();
const UP_RIGHT = new Vector3(8.9, 15.3, 0).normalize();
const ARM = 120;
const STEM = 470;
const SHELL_R = 2.8;
const CORE_R = 1.05;
/** Along the failing arm, where each reason code breaks through. */
const CRACK_S = [22, 40, 58, 76];
export const CRACKS = CRACK_S.map((s) => UP_LEFT.clone().multiplyScalar(s));
/** How far the light falls: to Aarav's phone, far below. */
export const DROP_DEPTH = 172;

const up = new Vector3(0, 1, 0);

/** A straight pipe from a to b as one cylinder, each vertex carrying its distance along the route. */
const segment = (a: Vector3, b: Vector3, r: number, s0: number, radial = 16) => {
  const len = a.distanceTo(b);
  const g = new CylinderGeometry(r, r, len, radial, Math.max(1, Math.round(len / 12)), true);
  const arc = new Float32Array(g.attributes.position!.count);
  for (let v = 0; v < arc.length; v++) arc[v] = s0 + g.attributes.position!.getY(v) + len / 2;
  g.setAttribute("aArc", new BufferAttribute(arc, 1));
  g.applyQuaternion(new Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize()));
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return g.translate(mid.x, mid.y, mid.z);
};

/** Hairline cracks across the front of the failing arm: short random walks on its surface. */
const crackLines = () => {
  const rand = seeded(23);
  const pts: number[] = [];
  const which: number[] = [];
  const front = new Vector3(0, 0, 1);
  const side = new Vector3().crossVectors(UP_LEFT, front).normalize();
  const on = (c: Vector3, along: number, theta: number) =>
    c
      .clone()
      .addScaledVector(UP_LEFT, along)
      .addScaledVector(front, Math.cos(theta) * SHELL_R * 1.015)
      .addScaledVector(side, Math.sin(theta) * SHELL_R * 1.015);
  CRACKS.forEach((c, k) => {
    for (let branch = 0; branch < 4; branch++) {
      let along = (rand() - 0.5) * 0.6;
      let theta = (rand() - 0.5) * 0.5;
      const dir = branch % 2 ? 1 : -1;
      for (let step = 0; step < 7; step++) {
        const a = on(c, along, theta);
        along += (rand() - 0.5) * 0.9;
        theta += dir * (0.1 + rand() * 0.16);
        const b = on(c, along, theta);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
        which.push(k, k);
      }
    }
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pts), 3));
  g.setAttribute("aCrack", new BufferAttribute(new Float32Array(which), 1));
  return g;
};

/** Cracks burn white while light leaks through them; sealed, they hold a steady gold seam. */
const crackMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    ...lightBlend,
    uniforms: { ...air, uTime: { value: 0 }, uSeal: { value: 0 }, uHot: { value: C.cream.clone().multiplyScalar(4) }, uGold: { value: C.lumen.clone().multiplyScalar(3.2) } },
    vertexShader: /* glsl */ `
      attribute float aCrack;
      varying float vK;
      varying vec3 vW;
      void main() {
        vK = aCrack;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uTime;
      uniform float uSeal;
      uniform vec3 uHot;
      uniform vec3 uGold;
      varying float vK;
      varying vec3 vW;
      void main() {
        float flick = 0.6 + 0.4 * sin(uTime * (11.0 + vK * 3.0) + vK * 7.0) * sin(uTime * 4.3 + vK);
        vec3 col = mix(uHot * flick, uGold, uSeal);
        float d = length(cameraPosition - vW) * uFogDensity;
        col *= exp(-d * d);
        gl_FragColor = vec4(min(col, vec3(1.9)), 1.0);
      }
    `,
    toneMapped: false,
  });

export function Fork() {
  const quality = useStore(gl, (s) => s.quality);
  const embersCount = quality === 2 ? 760 : quality === 1 ? 480 : 260;

  const geo = useMemo(() => {
    const top = new Vector3();
    const stemFrom = new Vector3(0, -STEM, 0);
    const paidEnd = UP_RIGHT.clone().multiplyScalar(ARM);
    const failEnd = UP_LEFT.clone().multiplyScalar(ARM);
    const shells = mergeGeometries([
      segment(stemFrom, top, SHELL_R, 0),
      segment(top, paidEnd, SHELL_R, 0),
      segment(top, failEnd, SHELL_R, 0),
      (() => {
        const hub = new SphereGeometry(SHELL_R * 1.5, 24, 16).toNonIndexed();
        hub.setAttribute("aArc", new BufferAttribute(new Float32Array(hub.attributes.position!.count), 1));
        return hub;
      })(),
    ].map((g) => (g.index ? g.toNonIndexed() : g)));
    const lit = mergeGeometries([segment(stemFrom, top, CORE_R, 0, 12), segment(top, paidEnd, CORE_R, STEM, 12)].map((g) => g.toNonIndexed()));
    const fail = segment(top, failEnd, CORE_R, STEM, 12);
    // flanges every few metres: they give the pipes their scale
    const flanges: Matrix4[] = [];
    const q = new Quaternion();
    const addRings = (a: Vector3, b: Vector3, every: number) => {
      const dir = b.clone().sub(a).normalize();
      q.setFromUnitVectors(new Vector3(0, 0, 1), dir);
      const len = a.distanceTo(b);
      for (let s = every; s < len; s += every) flanges.push(new Matrix4().compose(a.clone().addScaledVector(dir, s), q, new Vector3(1, 1, 1)));
    };
    addRings(stemFrom, top, 18);
    addRings(top, paidEnd, 16);
    addRings(top, failEnd, 16);
    return { shells, lit, fail, cracks: crackLines(), flange: new TorusGeometry(SHELL_R + 0.12, 0.2, 6, 40), flanges, sign: new PlaneGeometry(17, 4.25), glow: new PlaneGeometry(1, 1) };
  }, []);

  const embers = useMemo(() => {
    const g = new BufferGeometry();
    const rand = seeded(5);
    const crack = new Float32Array(embersCount);
    const seed = new Float32Array(embersCount * 4);
    for (let i = 0; i < embersCount; i++) {
      // more light leaks where more payments fail: the first crack bleeds the most
      crack[i] = Math.min(3, Math.floor(rand() ** 1.35 * 4));
      seed.set([rand(), rand() * 2 - 1, rand() * 2 - 1, rand()], i * 4);
    }
    g.setAttribute("position", new BufferAttribute(new Float32Array(embersCount * 3), 3));
    g.setAttribute("aCrack", new BufferAttribute(crack, 1));
    g.setAttribute("aSeed", new BufferAttribute(seed, 4));
    return g;
  }, [embersCount]);

  const mats = useMemo(() => {
    const lit = makeCore(STEM + ARM);
    const fail = makeCore(STEM + ARM);
    lit.uniforms.uFill!.value = 1;
    fail.uniforms.uFill!.value = 1;
    fail.uniforms.uCracks!.value = CRACK_S.map((s) => STEM + s);
    const ember = makeEmbers();
    ember.uniforms.uFall!.value = DROP_DEPTH * 1.9;
    const cracks = ember.uniforms.uCracks!.value as number[];
    CRACKS.forEach((c, i) => cracks.splice(i * 3, 3, c.x, c.y, c.z));
    return {
      shell: makeShell({ bottom: -80, height: 200 }),
      lit,
      fail,
      cracks: crackMaterial(),
      ember,
      rib: makeRib(),
      glows: CRACKS.map(() => makeGlow(C.cream.clone().multiplyScalar(2.6))),
      hero: makeGlow(C.lumen.clone().multiplyScalar(5)),
      leak: REASONS.map((r) => makeSign(reasonSign(r.code, r.note, false))),
      fixed: REASONS.map((r) => makeSign(reasonSign(r.code, r.fix, true))),
    };
  }, []);

  useEffect(
    () => () => {
      [geo.shells, geo.lit, geo.fail, geo.cracks, geo.flange, geo.sign, geo.glow, embers].forEach((g) => g.dispose());
      [mats.shell, mats.lit, mats.fail, mats.cracks, mats.ember, mats.rib, mats.hero, ...mats.glows].forEach((m) => m.dispose());
      [...mats.leak, ...mats.fixed].forEach((m) => {
        (m.uniforms.uMap!.value as { dispose: () => void }).dispose();
        m.dispose();
      });
    },
    [geo, mats, embers],
  );

  const flangeMesh = useRef<InstancedMesh>(null);
  useEffect(() => {
    const m = flangeMesh.current;
    if (!m) return;
    geo.flanges.forEach((mat, i) => m.setMatrixAt(i, mat));
    m.instanceMatrix.needsUpdate = true;
  }, [geo]);

  const root = useRef<Group>(null);
  const glows = useRef<(Mesh | null)[]>([]);
  const hero = useRef<Mesh>(null);
  const clock = useRef(0);

  useFrame((state, delta) => {
    const p = cine.p;
    const on = setAt(p) === "fork";
    if (root.current) root.current.visible = on;
    if (!on) return;
    const reduced = prefersReducedMotion();
    const t = reduced ? 0 : state.clock.elapsedTime;
    const dt = Math.min(0.05, delta);
    const seal = sealAt(p);
    // time slows while the leaks are on screen, and runs backwards as they seal
    const slow = p > 0.4 && p < 0.52 ? 0.45 : 1;
    const dir = seal > 0.02 ? -2.4 * Math.min(1, seal * 3) : 1;
    clock.current += reduced ? 0 : dt * slow * dir;

    for (const m of [mats.lit, mats.fail]) {
      m.uniforms.uTime!.value = t;
      m.uniforms.uSpeed!.value = slow;
    }
    mats.fail.uniforms.uSeal!.value = seal;
    // the whole fork brightens once it is whole again
    const whole = ramp(p, 0.78, 0.84);
    mats.lit.uniforms.uGain!.value = 1 + whole * 0.35;
    mats.fail.uniforms.uGain!.value = 1 + whole * 0.35;
    mats.shell.uniforms.uGlow!.value = 0.55 + whole * 0.4;
    mats.shell.uniforms.uLit!.value = 1;
    mats.cracks.uniforms.uTime!.value = t;
    mats.cracks.uniforms.uSeal!.value = seal;
    mats.rib.uniforms.uHeat!.value = 0.5 + whole * 0.5;

    const eu = mats.ember.uniforms;
    eu.uClock!.value = clock.current;
    eu.uAlpha!.value = 1 - ramp(seal, 0.75, 1);
    eu.uPx!.value = state.size.height * state.viewport.dpr * 0.5;

    glows.current.forEach((g, i) => {
      if (!g) return;
      g.quaternion.copy(state.camera.quaternion);
      const flick = 0.75 + 0.25 * Math.sin(t * (9 + i * 2.3) + i);
      mats.glows[i]!.uniforms.uAlpha!.value = (1 - seal) * flick + seal * 0.35;
      g.scale.setScalar(9 - seal * 4);
    });
    mats.leak.forEach((m, i) => {
      m.uniforms.uAlpha!.value = 1 - seal;
      mats.fixed[i]!.uniforms.uAlpha!.value = seal;
    });

    // the drop the camera follows down to the phone
    const h = hero.current;
    if (h) {
      const fall = ramp(p, SHOTS.leaks[1] - 0.02, 0.588);
      h.visible = p > 0.49 && p < 0.6;
      const c0 = CRACKS[0]!;
      h.position.set(c0.x + 0.8, c0.y - DROP_DEPTH * fall, 3.2);
      h.quaternion.copy(state.camera.quaternion);
      h.scale.set(1.6, 1.6 + Math.sin(Math.PI * fall) * 9, 1);
      mats.hero.uniforms.uAlpha!.value = 1 - ramp(p, 0.586, 0.6);
    }
  });

  return (
    <group ref={root}>
      <mesh geometry={geo.lit} material={mats.lit} />
      <mesh geometry={geo.fail} material={mats.fail} />
      <mesh geometry={geo.shells} material={mats.shell} renderOrder={3} />
      <instancedMesh ref={flangeMesh} args={[geo.flange, mats.rib, geo.flanges.length]} frustumCulled={false} />
      <lineSegments geometry={geo.cracks} material={mats.cracks} renderOrder={4} />
      <points geometry={embers} material={mats.ember} frustumCulled={false} renderOrder={5} />
      {CRACKS.map((c, i) => (
        <group key={i}>
          <mesh ref={(m) => void (glows.current[i] = m)} geometry={geo.glow} material={mats.glows[i]} position={[c.x, c.y, c.z + SHELL_R + 0.6]} renderOrder={6} />
          {/* the code sits to the left of its crack; the leader runs to it */}
          <mesh geometry={geo.sign} material={mats.leak[i]} position={[c.x - 8.5 - SHELL_R - 0.4, c.y + 0.2, 3.4]} renderOrder={6} />
          <mesh geometry={geo.sign} material={mats.fixed[i]} position={[c.x - 8.5 - SHELL_R - 0.4, c.y + 0.2, 3.4]} renderOrder={6} />
        </group>
      ))}
      <mesh ref={hero} geometry={geo.glow} material={mats.hero} visible={false} renderOrder={7} />
    </group>
  );
}
