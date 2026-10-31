"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, Group, InstancedBufferAttribute, InstancedBufferGeometry, InstancedMesh, Matrix4, PlaneGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gl, useStore } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import { C } from "../../materials";
import { seeded } from "../../random";
import { cine, EVENTS, ramp, setAt, SHOTS } from "./film";
import { makeGlow, makeRib, makeSign, makeStreaks } from "./shaders";
import { eventSign } from "./signs";

/** Inside the pipe. Half the inner width, the rib spacing, and how far it runs. */
const HALF = 13;
const RIB_GAP = 15;
export const STREAM_LEN = 430;
const SPAN = 190;

/** Where each event hangs on the wall: alternate sides, angled to meet the camera. */
const SIGNS = EVENTS.map((e, i) => ({ ...e, z: -70 - i * 74, x: i % 2 ? 5.2 : -5.6, y: i % 2 ? -2.6 : 2.4, turn: i % 2 ? -0.22 : 0.22 }));

/**
 * The stream: the camera is inside the S now, flying down the pipe with the light.
 * Square ribs on the logo's own section pass overhead, thousands of streaks overtake
 * the camera, and Aarav's events hang on the walls in the order he made them.
 */
export function Stream() {
  const quality = useStore(gl, (s) => s.quality);
  const count = quality === 2 ? 3200 : quality === 1 ? 2000 : 1000;

  const streaks = useMemo(() => {
    const g = new InstancedBufferGeometry();
    const quad = new PlaneGeometry(1, 1);
    g.index = quad.index;
    g.setAttribute("position", quad.attributes.position!);
    g.setAttribute("uv", quad.attributes.uv!);
    const rand = seeded(11);
    const seed = new Float32Array(count * 4);
    const size = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // anywhere in the section, but never through the lens
      let x = 0;
      let y = 0;
      do {
        x = (rand() * 2 - 1) * (HALF - 0.6);
        y = (rand() * 2 - 1) * (HALF - 0.6);
      } while (Math.hypot(x, y) < 1.8);
      const drop = rand() < 0.08;
      seed.set([x, y, rand(), 26 + rand() * 70], i * 4);
      size.set(drop ? [0.9, 0.42, 0] : [2 + rand() * 9, 0.05 + rand() * 0.17, rand() < 0.25 ? 1 : 0], i * 3);
    }
    g.setAttribute("aSeed", new InstancedBufferAttribute(seed, 4));
    g.setAttribute("aSize", new InstancedBufferAttribute(size, 3));
    g.instanceCount = count;
    return g;
  }, [count]);

  const ribs = useMemo(() => {
    const t = 0.16;
    const d = 0.4;
    const s = HALF * 2 + t;
    const frame = mergeGeometries([
      new BoxGeometry(s, t, d).translate(0, HALF, 0),
      new BoxGeometry(s, t, d).translate(0, -HALF, 0),
      new BoxGeometry(t, s, d).translate(HALF, 0, 0),
      new BoxGeometry(t, s, d).translate(-HALF, 0, 0),
    ]);
    const rails = mergeGeometries(
      [
        [HALF, HALF],
        [-HALF, HALF],
        [HALF, -HALF],
        [-HALF, -HALF],
      ].map(([x, y]) => new BoxGeometry(0.12, 0.12, STREAM_LEN).translate(x!, y!, -STREAM_LEN / 2 + 20)),
    );
    return { frame, rails, n: Math.ceil(STREAM_LEN / RIB_GAP) + 4 };
  }, []);

  const mats = useMemo(() => {
    const m = {
      streaks: makeStreaks(SPAN),
      rib: makeRib(),
      end: makeGlow(C.cream.clone().multiplyScalar(3)),
      signs: SIGNS.map((s, i) => makeSign(eventSign(i, SIGNS.length, s.name, s.detail))),
    };
    // the light at the end burns through the haze
    m.end.uniforms.uFog!.value = 0;
    return m;
  }, []);
  const geo = useMemo(() => ({ sign: new PlaneGeometry(14.4, 4.5), end: new PlaneGeometry(1, 1) }), []);

  useEffect(
    () => () => {
      streaks.dispose();
      ribs.frame.dispose();
      ribs.rails.dispose();
      mats.streaks.dispose();
      mats.rib.dispose();
      mats.end.dispose();
      mats.signs.forEach((m) => {
        (m.uniforms.uMap!.value as { dispose: () => void }).dispose();
        m.dispose();
      });
      geo.sign.dispose();
      geo.end.dispose();
    },
    [streaks, ribs, mats, geo],
  );

  const ribMesh = useRef<InstancedMesh>(null);
  useEffect(() => {
    const m = ribMesh.current;
    if (!m) return;
    const mat = new Matrix4();
    for (let i = 0; i < ribs.n; i++) m.setMatrixAt(i, mat.makeTranslation(0, 0, 20 - i * RIB_GAP));
    m.instanceMatrix.needsUpdate = true;
  }, [ribs]);

  const root = useRef<Group>(null);
  const end = useRef<Group>(null);

  useFrame((state) => {
    const p = cine.p;
    const on = setAt(p) === "stream";
    if (root.current) root.current.visible = on;
    if (!on) return;
    const t = prefersReducedMotion() ? 0 : state.clock.elapsedTime;
    const camZ = state.camera.position.z;
    const su = mats.streaks.uniforms;
    su.uTime!.value = t;
    su.uCamZ!.value = camZ;
    // faster camera, longer streaks: motion blur without a blur pass
    su.uStretch!.value = 1 + Math.min(3, cine.speed * 0.025);
    mats.rib.uniforms.uHeat!.value = 0.35 + 0.4 * Math.sin(t * 2.0) ** 2;
    mats.rib.uniforms.uGlowLine!.value = 0.14;
    // the light at the end of the pipe grows until it fills the frame
    const k = ramp(p, SHOTS.stream[1] - 0.045, SHOTS.stream[1]);
    if (end.current) end.current.scale.setScalar(24 + k * k * 300);
    mats.end.uniforms.uAlpha!.value = 0.12 + k * 1.6;
    mats.signs.forEach((m, i) => {
      // each sign brightens as the camera nears it
      const d = camZ - SIGNS[i]!.z;
      m.uniforms.uGain!.value = 0.5 + 1.1 * Math.exp(-Math.max(0, d) / 60);
    });
  });

  return (
    <group ref={root}>
      <instancedMesh ref={ribMesh} args={[ribs.frame, mats.rib, ribs.n]} frustumCulled={false} />
      <mesh geometry={ribs.rails} material={mats.rib} />
      <mesh geometry={streaks} material={mats.streaks} frustumCulled={false} renderOrder={4} />
      {SIGNS.map((s, i) => (
        <mesh key={s.name} geometry={geo.sign} material={mats.signs[i]} position={[s.x, s.y, s.z]} rotation={[0, s.turn, 0]} renderOrder={5} />
      ))}
      <group ref={end} position={[0, 0, -STREAM_LEN + 10]}>
        <mesh geometry={geo.end} material={mats.end} />
      </group>
    </group>
  );
}
