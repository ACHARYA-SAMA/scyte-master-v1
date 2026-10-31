"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, PerspectiveCamera, Vector2, Vector3 } from "three";
import type { BloomEffect, ChromaticAberrationEffect, DepthOfFieldEffect } from "postprocessing";
import { gl, ui } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import { air } from "./shaders";
import { cine, CUTS, film, flashAt, setAt, type SetId } from "./film";
import { FLOOR, GATE, GATE_GAP, GATE_MID } from "./Gate";
import { CRACKS, DROP_DEPTH } from "./Fork";

type V3 = [number, number, number];
/** A camera key. `stop` arrives and leaves at rest: holds, and the ends of a move. */
type Key = { at: number; pos: V3; look: V3; fov: number; stop?: boolean; roll?: number };
type Track = { set: SetId; keys: Key[] };

/** Live handles on the post chain, for the rig to drive. */
export type PostRefs = {
  bloom: BloomEffect | null;
  ca: ChromaticAberrationEffect | null;
  dof: DepthOfFieldEffect | null;
};

const MID: V3 = [GATE_MID.x, GATE_MID.y, GATE_MID.z];
const c0 = CRACKS[0]!;
const mid = CRACKS[1]!.clone().lerp(CRACKS[2]!, 0.5);

/**
 * The film's camera. Four tracks, one per set, joined by cuts hidden in light. The
 * first two keys and the last two are solved for the screen's shape at runtime: the
 * hero stands the gate in the frame, the finale leaves the bottom band for the copy.
 */
const TRACKS: Track[] = [
  {
    set: "gate",
    keys: [
      { at: 0, pos: [0, 7, 260], look: [0, 30, 0], fov: 30, stop: true },
      { at: 0.055, pos: [0, 8, 245], look: [0, 30, 0], fov: 30 },
      { at: 0.115, pos: [-10, 20, 150], look: [MID[0], MID[1] - 2, -GATE_GAP], fov: 30 },
      // through the first door, then on down the line, faster with every gate
      { at: 0.152, pos: [-1, MID[1] - 3, 28], look: [MID[0], MID[1] - 2, -GATE_GAP * 2], fov: 34 },
      { at: 0.172, pos: [0, MID[1] - 2, -GATE_GAP * 0.5], look: [MID[0], MID[1] - 3, -GATE_GAP * 4], fov: 44 },
      { at: CUTS[0], pos: [MID[0], MID[1] - 4, -GATE_GAP * 3.4], look: [MID[0], MID[1] - 6, -GATE_GAP * 7], fov: 78 },
    ],
  },
  {
    set: "stream",
    keys: [
      { at: CUTS[0], pos: [0, 0, 16], look: [0, 0, -30], fov: 76 },
      { at: 0.226, pos: [0, 0, -22], look: [0, 0.4, -72], fov: 50 },
      { at: 0.29, pos: [0, 0, -170], look: [0, 0, -220], fov: 46 },
      { at: 0.345, pos: [0, 0, -340], look: [0, 0, -390], fov: 48 },
      { at: CUTS[1], pos: [0, 0, -400], look: [0, 0, -450], fov: 84 },
    ],
  },
  {
    set: "fork",
    keys: [
      { at: CUTS[1], pos: [6, -86, 190], look: [0, -10, 0], fov: 62 },
      { at: 0.398, pos: [2, -28, 128], look: [-4, 22, 0], fov: 36 },
      { at: 0.445, pos: [-44, 26, 80], look: [mid.x + 2, mid.y, 0], fov: 33, stop: true },
      { at: 0.505, pos: [-48, 24, 74], look: [mid.x + 1, mid.y - 1, 0], fov: 33 },
      { at: 0.548, pos: [c0.x - 6, c0.y - 72, 50], look: [c0.x, c0.y - 116, 0], fov: 40 },
      { at: 0.592, pos: [c0.x - 15, c0.y - DROP_DEPTH, 54], look: [c0.x - 15, c0.y - DROP_DEPTH - 3, 0], fov: 34, stop: true },
      { at: 0.7, pos: [c0.x - 13, c0.y - DROP_DEPTH - 3, 51], look: [c0.x - 15, c0.y - DROP_DEPTH - 5, 0], fov: 34, stop: true },
      { at: 0.758, pos: [-46, 22, 78], look: [mid.x + 2, mid.y, 0], fov: 33 },
      { at: 0.8, pos: [-30, 34, 92], look: [mid.x + 22, mid.y + 6, 0], fov: 34 },
      { at: 0.838, pos: [40, 22, 210], look: [42, 44, 0], fov: 38 },
      { at: CUTS[2], pos: [0, 40, 70], look: [0, 74, -10], fov: 84 },
    ],
  },
  {
    set: "gate",
    keys: [
      // backing out of the line of gates: they rush past and settle into the distance
      { at: CUTS[2], pos: [MID[0], MID[1] - 4, -GATE_GAP * 2.5], look: [MID[0], MID[1] - 6, -GATE_GAP * 7], fov: 76 },
      { at: 0.875, pos: [2, MID[1] - 4, -GATE_GAP * 0.4], look: [MID[0], MID[1] - 4, -GATE_GAP * 5], fov: 46 },
      { at: 0.9, pos: [4, MID[1] - 6, 70], look: [MID[0], MID[1] - 2, -GATE_GAP * 2], fov: 36 },
      { at: 0.935, pos: [0, 9, 300], look: [0, 24, 0], fov: 30, stop: true },
      { at: 1, pos: [0, 10, 314], look: [0, 24, 0], fov: 30, stop: true },
    ],
  },
];

const trackAt = (p: number) => (p < CUTS[0] ? TRACKS[0]! : p < CUTS[1] ? TRACKS[1]! : p < CUTS[2] ? TRACKS[2]! : TRACKS[3]!);

/** The camera's velocity through key i, in units per unit of progress; zero at a stop. */
const tangent = (keys: Key[], i: number, field: "pos" | "look", k: 0 | 1 | 2) => {
  if (keys[i]!.stop) return 0;
  const a = keys[Math.max(0, i - 1)]!;
  const b = keys[Math.min(keys.length - 1, i + 1)]!;
  return ((b[field][k] - a[field][k]) / (b.at - a.at || 1)) * 0.9;
};

/**
 * Cubic Hermite through the keys, timed by progress, so the camera's speed carries
 * through every key that is not a stop: the move never stutters between beats.
 */
const sample = (p: number, pos: Vector3, look: Vector3) => {
  const { keys } = trackAt(p);
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1]!.at <= p) i++;
  const a = keys[i]!;
  const b = keys[i + 1]!;
  const h = b.at - a.at || 1;
  const t = Math.min(1, Math.max(0, (p - a.at) / h));
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const at = (field: "pos" | "look", k: 0 | 1 | 2) =>
    h00 * a[field][k] + h10 * h * tangent(keys, i, field, k) + h01 * b[field][k] + h11 * h * tangent(keys, i + 1, field, k);
  pos.set(at("pos", 0), at("pos", 1), at("pos", 2));
  look.set(at("look", 0), at("look", 1), at("look", 2));
  const s = t2 * (3 - 2 * t);
  return { fov: a.fov + (b.fov - a.fov) * s, roll: (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * s };
};

/** The air of each set: what the fog fades to, how thick it is, and the bloom it carries. */
const AIR: Record<SetId, { color: Color; density: number; bloom: number }> = {
  gate: { color: new Color("#060c08"), density: 0.0016, bloom: 1.3 },
  stream: { color: new Color("#040906"), density: 0.0058, bloom: 1.45 },
  fork: { color: new Color("#050b07"), density: 0.0036, bloom: 1.35 },
};

const INTRO_S = 4.6;
/** The lens every framing is solved for; the rig only widens it while the camera rushes. */
const BASE_FOV = 30;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function Rig({ post, focus }: { post: RefObject<PostRefs>; focus: Vector3 }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const v = useMemo(() => ({ pos: new Vector3(), look: new Vector3(), last: new Vector3(), up: new Vector3(0, 1, 0), dir: new Vector3() }), []);
  const st = useRef({ ps: 0, ready: false, frames: 0, introAt: 0, set: "gate" as SetId, fov: 30 });
  const pose = useRef({ high: { pos: new Vector3(0, 46, 170), look: new Vector3(0, 40, 0) }, low: { pos: new Vector3(0, 7, 260), look: new Vector3(0, 30, 0) } });
  const caOffset = useMemo(() => new Vector2(), []);

  // the film needs a deeper view than the rest of the site: the sky sits far behind the word
  useEffect(() => {
    const far = camera.far;
    camera.far = 3400;
    camera.updateProjectionMatrix();
    return () => {
      camera.far = far;
      camera.fov = 30;
      camera.rotation.z = 0;
      camera.updateProjectionMatrix();
      cine.live = false;
      film.set({ glass: false });
    };
  }, [camera]);

  // frames solved for this screen: the gate stands in the hero whatever its shape
  useEffect(() => {
    const fit = () => {
      const half = Math.tan((BASE_FOV * Math.PI) / 360);
      const aspect = size.width / size.height;
      // tall enough on a wide screen, narrow enough on a tall one
      const d = Math.max(GATE.h / (0.52 * 2 * half), GATE.w / (0.84 * 2 * half * aspect));
      pose.current.low.pos.set(0, FLOOR + 7, d);
      pose.current.low.look.set(0, FLOOR + 30, 0);
      pose.current.high.pos.set(0, FLOOR + 48, d * 0.66);
      pose.current.high.look.set(0, FLOOR + 40, 0);
      const k1 = TRACKS[0]!.keys[1]!;
      k1.pos = [0, FLOOR + 8, d * 0.94];
      k1.look = [0, FLOOR + 30, 0];
      const fin = Math.max(300, d * 1.16);
      const keys = TRACKS[3]!.keys;
      keys[2]!.pos = [0, FLOOR + 9, fin];
      keys[3]!.pos = [0, FLOOR + 10, fin * 1.045];
      // a tall screen gives the copy its lower half: the gate rises into the upper one
      const lookY = aspect < 1 ? FLOOR + 2 : FLOOR + 24;
      keys[2]!.look = [0, lookY, 0];
      keys[3]!.look = [0, lookY, 0];
      // the haze scales with the shot, so a phone's farther camera still sees the gate
      AIR.gate.density = 0.42 / d;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [size.width, size.height]);

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const s = st.current;
    const g = gl.get();
    const reduced = prefersReducedMotion();

    // eased progress: the camera glides along its path rather than cutting corners
    const raw = g.progress;
    if (!s.ready || reduced) s.ps = raw;
    else s.ps += (raw - s.ps) * (1 - Math.exp(-dt * 5.2));
    if (Math.abs(raw - s.ps) < 1e-5) s.ps = raw;
    const p = s.ps;
    cine.p = p;
    cine.live = true;

    // the title sequence starts once the page is uncovered and the first frames are in
    const u = ui.get();
    if (!s.introAt && s.frames > 3 && u.preloaderDone && u.transition === "idle") s.introAt = state.clock.elapsedTime;
    const intro = reduced ? 1 : s.introAt ? Math.min(1, (state.clock.elapsedTime - s.introAt) / INTRO_S) : 0;
    cine.intro = intro;

    // key 0 cranes down from above the gate to the low shot over the water
    const k0 = TRACKS[0]!.keys[0]!;
    const e = ease(Math.min(1, Math.max(0, (intro - 0.08) / 0.92)));
    v.pos.lerpVectors(pose.current.high.pos, pose.current.low.pos, e);
    v.look.lerpVectors(pose.current.high.look, pose.current.low.look, e);
    k0.pos = [v.pos.x, v.pos.y, v.pos.z];
    k0.look = [v.look.x, v.look.y, v.look.z];
    k0.fov = 30;

    const { fov, roll } = sample(p, v.pos, v.look);
    const set = setAt(p);
    const cut = set !== s.set;
    s.set = set;

    // inside the pipe the camera rides the current: a slow sway and a little roll
    let r = roll;
    if (set === "stream" && !reduced) {
      const z = v.pos.z;
      v.pos.x += Math.sin(z * 0.021) * 1.5;
      v.pos.y += Math.sin(z * 0.013 + 1) * 1.0;
      v.look.x += Math.sin(z * 0.021 - 0.6) * 1.2;
      r += Math.sin(z * 0.017) * 0.05;
    }
    // a breath of pointer parallax on the held shots
    if (!reduced && p > 0.06) {
      const k = set === "stream" ? 0.6 : 1.4;
      v.pos.x += g.px * k;
      v.pos.y += g.py * k * 0.6;
    }
    // the hero breathes while it waits
    if (!reduced && p < 0.06) {
      const t = state.clock.elapsedTime;
      v.pos.x += Math.sin(t * 0.21) * 1.6 * e;
      v.pos.y += Math.sin(t * 0.17 + 1) * 0.5 * e;
    }

    camera.position.copy(v.pos);
    focus.copy(v.look);
    camera.up.copy(v.up);
    camera.lookAt(v.look);
    if (r) camera.rotateZ(r);

    // speed: chromatic fringing, depth of field and a wider lens when the camera rushes
    const speed = s.ready && !cut ? v.pos.distanceTo(v.last) / Math.max(1e-3, dt) : 0;
    v.last.copy(v.pos);
    cine.speed += (speed - cine.speed) * Math.min(1, dt * 6);
    const rush = Math.min(1, cine.speed / 160);
    const flash = flashAt(p);
    const fovWant = fov + rush * 8;
    s.fov = !s.ready || cut || reduced ? fovWant : s.fov + (fovWant - s.fov) * Math.min(1, dt * 8);
    if (Math.abs(camera.fov - s.fov) > 0.01) {
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
    }
    const fx = post.current;
    if (fx?.ca) {
      const a = reduced ? 0 : rush * 0.0028 + flash * 0.004;
      caOffset.set(a, a * 0.55);
      fx.ca.offset.copy(caOffset);
    }
    const airNow = AIR[set];
    if (fx?.bloom) fx.bloom.intensity = airNow.bloom * (1 + flash * 2.2);
    if (fx?.dof) fx.dof.bokehScale = 1.2 + rush * 2.5;

    // the air of the set the camera is in
    air.uFogColor.value.copy(airNow.color);
    air.uFogDensity.value = airNow.density;
    if (scene.background instanceof Color) scene.background.copy(airNow.color);

    s.ready = true;
    if (++s.frames === 4) film.set({ glass: true });
  });

  return null;
}
