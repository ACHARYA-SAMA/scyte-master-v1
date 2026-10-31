"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, FXAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type ChromaticAberrationEffect } from "postprocessing";
import {
  BoxGeometry,
  CircleGeometry,
  DoubleSide,
  Group,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Color,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gl, useStore } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import { junction, SLOTS, TRAVEL_MS } from "@/lib/junction";
import { Studio } from "../../Studio";
import { BulbString, type Bulb } from "../../BulbString";
import { C, makeGlass, makeMetal } from "../../materials";
import { projectAnchors } from "../../anchors";

import { ANG, CAM, FOV, PORTAL, PIPE_R, R, at, dirOf, pipeCurve, portalCenter } from "./layout";
import { Atmosphere } from "./Atmosphere";

/* ------------------------------------------------------------------ shaders */
const coreMaterial = (length: number) =>
  new ShaderMaterial({
    side: DoubleSide,
    toneMapped: false,
    uniforms: { uTime: { value: 0 }, uFill: { value: 0 }, uLit: { value: 0 }, uLength: { value: length } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uFill;
      uniform float uLit;
      uniform float uLength;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        float s = vUv.x;
        vec3 lumen = vec3(0.976, 0.863, 0.49);
        vec3 dim = vec3(0.17, 0.24, 0.19);
        float front = smoothstep(uFill + 0.012, uFill - 0.012, s);
        float pulse = 0.82 + 0.18 * sin(s * uLength * 0.6 - uTime * 7.0);
        vec3 col = mix(dim * (0.4 + 0.5 * uLit), lumen * (1.25 + 0.55 * pulse), front);
        // the meniscus: a bright band riding the front of the liquid
        col += lumen * 1.3 * exp(-abs(s - uFill) * uLength * 0.9) * step(0.002, uFill);
        float rim = pow(1.0 - abs(dot(vN, vView)), 2.0);
        col += lumen * rim * 0.22 * uLit;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

/**
 * What each portal shows: a small loop of its page's signature object, drawn in the
 * shader with antialiased distance fields and seen through rippling glass.
 */
const portalMaterial = (kind: number) =>
  new ShaderMaterial({
    side: DoubleSide,
    toneMapped: false,
    uniforms: { uTime: { value: 0 }, uKind: { value: kind }, uLit: { value: 0 }, uCharge: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uKind;
      uniform float uLit;
      uniform float uCharge;
      varying vec2 vUv;
      float fill(float d) { float w = fwidth(d) * 0.8; return 1.0 - smoothstep(-w, w, d); }
      float box(vec2 p, vec2 b) { vec2 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
      float circle(vec2 p, float r) { return length(p) - r; }
      void main() {
        vec2 uv = vUv;
        uv += 0.005 * vec2(sin(uv.y * 26.0 + uTime * 1.4), cos(uv.x * 21.0 - uTime * 1.1));
        vec2 p = (uv * 2.0 - 1.0) * vec2(${(PORTAL.w / PORTAL.h).toFixed(4)}, 1.0);
        vec3 L = vec3(0.976, 0.863, 0.49);
        vec3 K = vec3(0.76, 0.72, 0.59);
        vec3 col = vec3(0.035, 0.065, 0.045);
        float t = uTime;
        int k = int(uKind + 0.5);
        if (k == 0) {
          // the leak: a pipe, drops falling, one escaping through a crack
          col += K * 0.5 * fill(abs(box(p - vec2(0.0, 0.55), vec2(0.42, 0.09))) - 0.012);
          col += K * 0.5 * fill(abs(box(p - vec2(0.0, -0.1), vec2(0.09, 0.6))) - 0.012);
          for (int i = 0; i < 6; i++) {
            float f = fract(t * 0.32 + float(i) / 6.0);
            col += L * fill(circle(p - vec2(0.0, 0.5 - f * 1.3), 0.045));
          }
          float e = fract(t * 0.25);
          col += L * 0.8 * fill(circle(p - vec2(0.1 + e * 0.5, 0.1 - e * e * 0.9), 0.035));
        } else if (k == 1) {
          // the machine: a belt of parcels under six station lamps lighting in turn
          col += K * 0.5 * fill(abs(p.y + 0.32) - 0.01);
          for (int i = 0; i < 5; i++) {
            float x = fract(t * 0.12 + float(i) / 5.0) * 1.8 - 0.9;
            col += L * 0.85 * fill(box(p - vec2(x, -0.22), vec2(0.06, 0.06)));
          }
          float on = mod(floor(t * 1.6), 7.0);
          for (int i = 0; i < 6; i++) {
            float x = -0.55 + float(i) * 0.22;
            float lit = float(i) <= on ? 1.0 : 0.15;
            col += L * lit * fill(circle(p - vec2(x, 0.35), 0.05));
            col += K * 0.35 * fill(abs(box(p - vec2(x, 0.05), vec2(0.07, 0.18))) - 0.008);
          }
        } else if (k == 2) {
          // the assembly: five layers breathing apart and settling together
          float open = 0.5 + 0.5 * sin(t * 0.9);
          for (int i = 0; i < 5; i++) {
            float y = (float(i) - 2.0) * (0.13 + open * 0.13);
            float w = 0.5 - abs(float(i) - 2.0) * 0.05;
            float layer = fill(box(p - vec2(0.0, y), vec2(w, 0.035)));
            col += mix(K * 0.55, L, float(i == 2)) * layer;
          }
        } else if (k == 3) {
          // the archive: a film leader counting down
          for (int i = 0; i < 8; i++) {
            float y = fract(float(i) / 8.0 - t * 0.2) * 2.4 - 1.2;
            col += K * 0.4 * fill(box(vec2(abs(p.x) - 0.6, p.y - y), vec2(0.035, 0.05)));
          }
          float r = length(p);
          col += K * 0.55 * fill(abs(r - 0.4) - 0.008) + K * 0.35 * fill(abs(r - 0.25) - 0.006);
          float a = atan(p.y, p.x);
          float sweep = mod(-t * 2.0, 6.2832) - 3.1416;
          float wedge = step(0.0, sin(a - sweep)) * step(sin(a - sweep), 0.35) * step(r, 0.4);
          col += L * 0.6 * wedge;
          col += K * 0.5 * (fill(abs(p.x) - 0.006) + fill(abs(p.y) - 0.006)) * step(r, 0.48);
        } else if (k == 4) {
          // the scan: a radar sweep finding four people
          float r = length(p);
          for (int i = 1; i < 4; i++) col += K * 0.35 * fill(abs(r - float(i) * 0.16) - 0.006);
          float a = atan(p.y, p.x);
          float sweep = mod(t * 1.4, 6.2832) - 3.1416;
          float trail = exp(-mod(sweep - a + 6.2832, 6.2832) * 2.2) * step(r, 0.5);
          col += L * 0.5 * trail;
          for (int i = 0; i < 4; i++) {
            float ang = float(i) * 1.7 + 0.6;
            vec2 q = vec2(cos(ang), sin(ang)) * (0.18 + float(i) * 0.07);
            float hit = exp(-mod(sweep - ang + 6.2832, 6.2832) * 1.5);
            col += L * (0.25 + hit) * fill(circle(p - q, 0.03));
          }
        } else {
          // the conversation: bubbles rising, and someone typing
          for (int i = 0; i < 4; i++) {
            float y = fract(t * 0.08 + float(i) * 0.25) * 1.6 - 0.95;
            float side = mod(float(i), 2.0) * 2.0 - 1.0;
            float b = fill(box(p - vec2(side * 0.16, y), vec2(0.3, 0.07)) - 0.04);
            col += mix(K * 0.45, L * 0.8, step(0.0, side)) * b * smoothstep(0.95, 0.6, abs(y));
          }
          for (int i = 0; i < 3; i++) {
            float up = 0.5 + 0.5 * sin(t * 6.0 - float(i) * 0.9);
            col += L * (0.3 + up * 0.7) * fill(circle(p - vec2(-0.42 + float(i) * 0.09, -0.78 + up * 0.02), 0.028));
          }
        }
        // brighter when chosen, blazing as the pipe fills
        col *= 0.5 + 0.55 * uLit;
        col += L * uCharge * uCharge * 0.9;
        float edge = smoothstep(1.0, 0.85, max(abs(uv.x * 2.0 - 1.0), abs(uv.y * 2.0 - 1.0)));
        gl_FragColor = vec4(col * (0.75 + 0.25 * edge), 1.0);
      }
    `,
  });

/** A square frame, from four bars: the logo's own square stroke. */
const frameGeometry = () => {
  const t = 0.7;
  const parts: BufferGeometry[] = [];
  const { w, h } = PORTAL;
  const bar = (bw: number, bh: number, x: number, y: number) => parts.push(new BoxGeometry(bw, bh, t).translate(x, y, 0));
  bar(w + t * 2, t, 0, h / 2 + t / 2);
  bar(w + t * 2, t, 0, -h / 2 - t / 2);
  bar(t, h, -w / 2 - t / 2, 0);
  bar(t, h, w / 2 + t / 2, 0);
  return mergeGeometries(parts, false);
};

/**
 * J1, the Junction: a glass-floored chamber seen low from the hub, six glass pipes
 * fanning out to six portals, one per page, in fixed slots. The highlighted pipe fills
 * with Lumen as you scroll, its bulbs lighting along the way; at full the camera dives
 * down it into the portal. Only the dive carries chromatic aberration; at rest the
 * chamber is sharp.
 */
/** Development only: ?jprof=post,portal,bulbs,floor,glass,metal switches parts off, to find what a frame costs. */
const prof = typeof window !== "undefined" && process.env.NODE_ENV !== "production" ? new URLSearchParams(window.location.search).get("jprof") ?? "" : "";
const off = (k: string) => prof.split(",").includes(k);

export default function JunctionScene() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const quality = useStore(gl, (s) => s.quality);
  const here = useStore(junction, (s) => s.here);

  const pipes = useMemo(
    () =>
      SLOTS.map((_, i) => {
        const curve = pipeCurve(i, i === here);
        const len = curve.getLength();
        const segs = Math.max(24, Math.round(len * 1.2));
        return {
          curve,
          len,
          shell: new TubeGeometry(curve as never, segs, PIPE_R, 16, false),
          core: new TubeGeometry(curve as never, segs, PIPE_R * 0.42, 10, false),
          coreMat: coreMaterial(len),
        };
      }),
    [here],
  );
  const portals = useMemo(() => SLOTS.map((_, i) => portalMaterial(i)), []);
  const shared = useMemo(
    () => ({
      glass: makeGlass({ thickness: 0.8, roughness: 0.05, tint: "#b9c7b6" }),
      metal: makeMetal("#2b3a2f", 0.3),
      frame: frameGeometry(),
      plane: new PlaneGeometry(PORTAL.w, PORTAL.h),
      padGeo: new CircleGeometry(3.4, 48),
      ringGeo: new RingGeometry(3.6, 3.9, 64),
      hubGeo: new RingGeometry(3.2, 3.36, 72),
      lowGlass: new MeshStandardMaterial({ color: new Color("#a9bba6"), roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.26, depthWrite: false }),
    }),
    [],
  );
  const outlines = useMemo(() => SLOTS.map(() => new MeshBasicMaterial({ color: C.lumen.clone(), toneMapped: false })), []);
  const padMat = useMemo(() => new MeshBasicMaterial({ color: C.lumen.clone().multiplyScalar(0.35), toneMapped: false, transparent: true, opacity: 0.9 }), []);

  // bulbs on top of every pipe's floor run, numbered by pipe and how far along they sit
  const lamps = useMemo(() => {
    const bulbs: Bulb[] = [];
    const meta: { pipe: number; f: number }[] = [];
    SLOTS.forEach((_, i) => {
      const p = pipes[i]!;
      const runEnd = i === here ? 1 : (R - 11) / p.len;
      for (let f = 0.12; f < runEnd; f += 4.6 / p.len) {
        const v = p.curve.getPointAt(Math.min(1, f));
        bulbs.push({ x: v.x, y: v.y + PIPE_R + 0.05, z: v.z, order: bulbs.length });
        meta.push({ pipe: i, f });
      }
    });
    return { bulbs, meta };
  }, [pipes, here]);

  const levels = useMemo(
    () => (i: number, t: number) => {
      const s = junction.get();
      const m = lamps.meta[i]!;
      if (m.pipe === s.here) return 0.1;
      if (s.phase === "travel") return m.pipe === s.target ? 1.15 : 0.04;
      if (m.pipe === s.hi) return s.charge >= m.f ? 1.05 : 0.16 + 0.06 * Math.sin(t * 3 + m.f * 12);
      // the story-next pipe runs a chase toward its portal: Continue
      if (m.pipe === s.next) return 0.1 + 0.26 * Math.max(0, Math.sin(t * 2.6 - m.f * 9));
      return 0.06;
    },
    [lamps],
  );

  useEffect(
    () => () => {
      pipes.forEach((p) => {
        p.shell.dispose();
        p.core.dispose();
        p.coreMat.dispose();
      });
    },
    [pipes],
  );
  useEffect(
    () => () => {
      portals.forEach((m) => m.dispose());
      outlines.forEach((m) => m.dispose());
      padMat.dispose();
      Object.values(shared).forEach((o) => o.dispose());
    },
    [portals, outlines, padMat, shared],
  );

  // the chamber is seen wider than the rest of the site; give the camera back on the way out
  useEffect(() => {
    const prev = camera.fov;
    camera.fov = FOV;
    camera.updateProjectionMatrix();
    return () => {
      camera.fov = prev;
      camera.updateProjectionMatrix();
    };
  }, [camera]);

  const groups = useRef<(Group | null)[]>([]);
  const ca = useRef<ChromaticAberrationEffect>(null);
  const caOffset = useMemo(() => new Vector2(0, 0), []);
  const anchors = useMemo(() => Object.fromEntries(SLOTS.map((_, i) => [`j-sign-${i}`, new Vector3()])) as Record<string, Vector3>, []);
  const tmp = useMemo(() => ({ pos: new Vector3(), look: new Vector3(), want: new Vector3(), wantLook: new Vector3(), a: new Vector3(), b: new Vector3() }), []);
  const cam = useRef({ yaw: 0, ready: false, fov: FOV });
  const frames = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const t = state.clock.elapsedTime;
    const s = junction.get();
    const reduced = prefersReducedMotion();
    const g = gl.get();

    // the pipes, their liquid and the portals
    SLOTS.forEach((_, i) => {
      const p = pipes[i]!;
      const u = p.coreMat.uniforms;
      u.uTime!.value = t;
      const lit = i === s.hi ? 1 : i === s.next ? 0.45 : 0.15;
      u.uLit!.value += (lit - u.uLit!.value) * Math.min(1, dt * 8);
      const fill = s.phase === "travel" && i === s.target ? 1 : i === s.hi ? s.charge : 0;
      u.uFill!.value += (fill - u.uFill!.value) * Math.min(1, dt * 14);
      const pm = portals[i]!.uniforms;
      pm.uTime!.value = t;
      pm.uLit!.value = u.uLit!.value;
      pm.uCharge!.value = i === s.hi || i === s.target ? u.uFill!.value : 0;
      outlines[i]!.color.copy(C.lumen).multiplyScalar(0.25 + u.uLit!.value * 0.9 + pm.uCharge!.value * 1.4);
      const grp = groups.current[i];
      if (grp) {
        // the chosen portal leans in and grows as its pipe fills
        const k = 1 + pm.uCharge!.value * 0.16 + (i === s.hi ? 0.03 : 0);
        grp.scale.setScalar(grp.scale.x + (k - grp.scale.x) * Math.min(1, dt * 8));
      }
    });
    padMat.color.copy(C.lumen).multiplyScalar(0.3 + 0.1 * Math.sin(t * 2));

    // the camera: low at the hub, yawing up to 12 degrees toward the highlighted pipe
    const c = cam.current;
    // narrow screens turn to face the chosen portal: the fan becomes a rotary selector
    const turn = size.width / size.height < 1 ? 0.95 : 0.32;
    const yawWant = (ANG[s.hi] ?? 0) * turn + (reduced ? 0 : g.px * 0.02);
    c.yaw += (yawWant - c.yaw) * Math.min(1, dt * 4);
    const dir = dirOf(s.hi);
    tmp.want.copy(CAM).addScaledVector(dir, s.charge * 16).add(tmp.a.set(0, -s.charge * 1.2, 0));
    tmp.wantLook.set(Math.sin(c.yaw) * 96, 5, CAM.z - Math.cos(c.yaw) * 96);
    let fovWant = FOV - s.charge * 4;

    if (s.phase === "travel" && s.target >= 0) {
      // the dive: accelerating along the pipe and through the portal
      const k = Math.min(1, (performance.now() - s.travelAt) / TRAVEL_MS);
      const e = k * k * (3 - 2 * k) * 0.4 + k * k * 0.6;
      const p = pipes[s.target]!;
      p.curve.getPointAt(Math.min(1, 0.35 + e * 0.65), tmp.a);
      tmp.want.lerpVectors(tmp.want, tmp.a.setY(tmp.a.y + 3.2), Math.min(1, e * 1.4));
      tmp.b.copy(portalCenter(s.target));
      tmp.wantLook.lerp(tmp.b, Math.min(1, k * 2));
      if (k > 0.8) tmp.want.lerp(tmp.b, (k - 0.8) * 5);
      fovWant = FOV + e * 30;
      caOffset.set(0.0035 * e, 0.0018 * e);
    } else caOffset.set(0, 0);
    if (ca.current) ca.current.offset.copy(caOffset);

    if (!c.ready || reduced) {
      tmp.pos.copy(tmp.want);
      tmp.look.copy(tmp.wantLook);
      c.ready = true;
    } else {
      const kk = s.phase === "travel" ? 1 : 1 - Math.exp(-dt * 6);
      tmp.pos.lerp(tmp.want, kk);
      tmp.look.lerp(tmp.wantLook, kk);
    }
    c.fov += (fovWant - c.fov) * Math.min(1, dt * (s.phase === "travel" ? 20 : 5));
    if (Math.abs(camera.fov - c.fov) > 0.01) {
      camera.fov = c.fov;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(tmp.pos);
    camera.lookAt(tmp.look);

    SLOTS.forEach((_, i) => {
      const v = anchors[`j-sign-${i}`]!;
      if (i === here) v.copy(at(i, R * 0.42, 1.2));
      else v.copy(portalCenter(i)).setY(PORTAL.base + PORTAL.h + 2.2);
    });
    projectAnchors(camera, anchors, size.width, size.height);
    if (++frames.current === 3) junction.set({ drawn: true });
  });

  useEffect(() => () => junction.set({ drawn: false }), []);

  const q2 = quality === 2;

  return (
    <>
      <color attach="background" args={["#070e09"]} />
      <fog attach="fog" args={["#070e09", 60, 330]} />
      <Studio intensity={0.45} />
      <ambientLight intensity={0.1} color="#cfc7aa" />

      {off("floor") ? null : <Atmosphere pipes={pipes} />}
      <mesh geometry={shared.hubGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <meshBasicMaterial color={C.khaki} toneMapped={false} />
      </mesh>

      {SLOTS.map((_, i) => {
        const p = pipes[i]!;
        const isHere = i === here;
        const pc = portalCenter(i);
        return (
          <group key={i}>
            {off("glass") ? null : <mesh geometry={p.shell} material={q2 ? shared.glass : shared.lowGlass} renderOrder={1} />}
            <mesh geometry={p.core} material={p.coreMat} />
            {/* the reflection: the core mirrored under the glass floor */}
            <mesh geometry={p.core} material={p.coreMat} scale={[1, -1, 1]} />
            {isHere ? (
              <group position={at(i, R * 0.42, 0.04)}>
                <mesh geometry={shared.padGeo} material={padMat} rotation={[-Math.PI / 2, 0, 0]} />
                <mesh geometry={shared.ringGeo} rotation={[-Math.PI / 2, 0, 0]}>
                  <meshBasicMaterial color={C.cream} toneMapped={false} />
                </mesh>
              </group>
            ) : (
              <group ref={(g) => void (groups.current[i] = g)} position={pc} rotation={[0, -ANG[i]!, 0]}>
                {off("portal") ? null : <mesh geometry={shared.plane} material={portals[i]!} />}
                {off("metal") ? null : <mesh geometry={shared.frame} material={shared.metal} />}
                <mesh geometry={shared.frame} material={outlines[i]!} scale={[1.012, 1.008, 0.4]} position={[0, 0, 0.32]} />
                {/* reflected below the floor */}
                <mesh geometry={shared.plane} material={portals[i]!} position={[0, -pc.y * 2, 0]} scale={[1, -1, 1]} />
                <mesh geometry={shared.frame} material={outlines[i]!} position={[0, -pc.y * 2, 0.32]} scale={[1.012, -1.008, 0.4]} />
              </group>
            )}
          </group>
        );
      })}

      {off("bulbs") ? null : <BulbString bulbs={lamps.bulbs} radius={0.42} mount={1} ignite={0} on facing="y" level={levels} />}

      {off("post") ? null : (
      <EffectComposer multisampling={q2 ? 4 : 0} enableNormalPass={false}>
        {/* only the liquid, the filaments and a filling portal pass this threshold: the glass's highlights never bloom */}
        <Bloom intensity={0.6} luminanceThreshold={1.02} luminanceSmoothing={0.08} mipmapBlur radius={0.62} levels={off("bloom8") ? 8 : 5} resolutionScale={q2 ? 1 : 0.5} />
        {off("ca") ? <></> : <ChromaticAberration ref={ca} offset={caOffset} radialModulation={false} modulationOffset={0} blendFunction={BlendFunction.NORMAL} />}
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        {off("vig") ? <></> : <Vignette offset={0.3} darkness={0.5} />}
        {q2 || off("fxaa") ? <></> : <FXAA />}
      </EffectComposer>
      )}
    </>
  );
}
