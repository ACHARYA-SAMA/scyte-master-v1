"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import {
  AdditiveBlending,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Object3D,
  PerspectiveCamera,
  ShaderMaterial,
  Vector3,
} from "three";
import { gl, ui, useStore } from "@/lib/store";
import { prefersReducedMotion, springStep } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { Studio } from "../../Studio";
import { Post } from "../../Post";
import { Backdrop } from "../../Backdrop";
import { C, makeGlass, makeGlow, makeMatte, makeMetal } from "../../materials";
import { drift } from "../../idle";
import { projectAnchors } from "../../anchors";
import { LINE_STATIONS, line } from "./line";

/** Station centres along the belt (local x). */
const SX = LINE_STATIONS.map((_, i) => -50 + i * 20);
const BELT_START = -64;
const BELT_END = 50;
const BELT_Y = 0.35;
const DROP_Y = BELT_Y + 0.72;
const DROPS = 54;
/** where the holdout lane leaves the main belt, and where it runs */
const SPLIT_X = SX[3]! + 2;
const HOLD_Z = 8;
const SPEED = 7.5;
/** illustrative order rates from the business model: messaged and held out */
const RATE_M = 0.04;
const RATE_H = 0.016;
/** a column is full at this order rate */
const FULL_RATE = 0.05;

const LIFT = { stiffness: 170, damping: 15, mass: 1 };
const TOKEN = { stiffness: 26, damping: 9, mass: 1 };

/** Point on a drop's route at distance x along the line, on lane 0 (main) or 1 (holdout). */
const routeZ = (x: number, lane: number) => {
  if (lane === 0 || x <= SPLIT_X) return 0;
  const t = Math.min(1, (x - SPLIT_X) / 8);
  return HOLD_Z * (t * t * (3 - 2 * t));
};

const beltMaterial = () =>
  new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLen: { value: BELT_END - BELT_START + 6 }, uBase: { value: C.groundDeep.clone() }, uLine: { value: C.line.clone() }, uLit: { value: C.khaki.clone() } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      void main() { vUv = uv; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uLen;
      uniform vec3 uBase, uLine, uLit;
      varying vec2 vUv;
      varying vec3 vN;
      void main() {
        // chevrons travelling with the belt, on the top face only
        float s = vUv.x * uLen - uTime * ${SPEED.toFixed(1)};
        float chev = fract((s + abs(vUv.y - 0.5) * 2.2) / 2.4);
        float aa = fwidth(chev) * 1.5;
        float stripe = smoothstep(0.0, aa, chev) * (1.0 - smoothstep(0.08, 0.08 + aa, chev));
        float top = step(0.5, vN.y);
        vec3 col = mix(uBase * 0.7, uLine * 1.2, stripe * top * 0.55);
        // a worn centre line
        float mid = 1.0 - smoothstep(0.0, fwidth(vUv.y) * 2.0, abs(vUv.y - 0.5) - 0.004);
        col = mix(col, uLit * 0.35, mid * top * 0.4);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

const cheapGlass = () =>
  new MeshPhysicalMaterial({
    color: new Color("#d9e4d6"),
    metalness: 0,
    roughness: 0.06,
    transparent: true,
    opacity: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.8,
    depthWrite: false,
  });

/** A rising scan line, a sending ring: emissive Lumen with its own fade. */
const lumenBasic = (strength = 2) => new MeshBasicMaterial({ color: C.lumen.clone().multiplyScalar(strength), toneMapped: false });

export default function LineScene() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const q = useStore(gl, (s) => s.quality);

  const mats = useMemo(() => {
    const glass = q === 2 ? makeGlass({ thickness: 1.4, roughness: 0.06 }) : cheapGlass();
    return {
      glass,
      metal: makeMetal("#2b3a2f", 0.34),
      metalDark: makeMetal("#1d281f", 0.4),
      matte: makeMatte("#1b261d"),
      belt: beltMaterial(),
      lumen: lumenBasic(2.2),
      lumenSoft: lumenBasic(1.2),
      lampOff: new MeshBasicMaterial({ color: C.line.clone().multiplyScalar(1.4), toneMapped: false }),
      khaki: new MeshBasicMaterial({ color: C.khaki.clone(), toneMapped: false }),
      glow: makeGlow(),
      liquid: new MeshBasicMaterial({ color: C.lumen.clone().multiplyScalar(1.5), toneMapped: false, transparent: true, opacity: 0.85 }),
      liquidDim: new MeshBasicMaterial({ color: C.lumen.clone().multiplyScalar(0.7), toneMapped: false, transparent: true, opacity: 0.75 }),
      rings: [0, 1, 2].map(() => new MeshBasicMaterial({ color: C.lumen.clone().multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.8, depthWrite: false, blending: AdditiveBlending })),
      screens: [0, 1, 2].map(() => new MeshBasicMaterial({ color: C.lumen.clone().multiplyScalar(0.5), toneMapped: false })),
      pick: new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
      drop: new MeshBasicMaterial({ color: new Color(1, 1, 1), toneMapped: false }),
    };
  }, [q]);
  useEffect(() => () => Object.values(mats).flat().forEach((m) => m.dispose()), [mats]);

  const root = useRef<Group>(null);
  const stations = useRef<(Group | null)[]>([]);
  const lamps = useRef<(Mesh | null)[]>([]);
  const scan = useRef<Mesh>(null);
  const arms = useRef<Group>(null);
  const gateLamp = useRef<Mesh>(null);
  const flipper = useRef<Mesh>(null);
  const rings = useRef<(Mesh | null)[]>([]);
  const screens = useRef<(Mesh | null)[]>([]);
  const fillM = useRef<Mesh>(null);
  const fillH = useRef<Mesh>(null);
  const domeRing = useRef<Mesh>(null);
  const token = useRef<Group>(null);
  const tokenGlow = useRef<Mesh>(null);
  const drops = useRef<InstancedMesh>(null);

  // the drops: where each is, which lane it took, whether it has been messaged
  const sim = useMemo(() => {
    // shoppers arrive in bunches, not on a metronome: uneven gaps along the belt
    let x = BELT_START;
    const items = Array.from({ length: DROPS }, (_, i) => ({
      x: (x += 0.8 + ((i * 7919) % 13) / 13 * 2.6 + (i % 9 === 0 ? 3.5 : 0)) > BELT_END ? BELT_START + ((x - BELT_START) % (BELT_END - BELT_START)) : x,
      lane: i % 10 === 3 ? 1 : 0,
      flash: 0,
      fall: 0,
    }));
    return {
      items,
      lift: SX.map(() => ({ y: 0, v: 0 })),
      token: { x: SX[0]!, v: 0 },
      orders: { m: 0, mn: 0, h: 0, hn: 0, levelM: 0, vm: 0, levelH: 0, vh: 0 },
      sendPulse: [0, 0, 0],
      arm: { a: 0, target: 0 },
      flip: { a: 0, target: 0 },
      lastStation: -1,
      pointer: { lane: 0 },
    };
  }, []);

  const tmp = useMemo(() => ({ o: new Object3D(), c: new Color(), look: new Vector3(), want: new Vector3() }), []);
  const anchors = useMemo(() => Object.fromEntries(LINE_STATIONS.map((s) => [`line-${s.id}`, new Vector3()]).concat([["line-token", new Vector3()]])) as Record<string, Vector3>, []);
  const cam = useRef({ pos: new Vector3(), look: new Vector3(), ready: false });

  useEffect(() => {
    drops.current?.instanceMatrix.setUsage(DynamicDrawUsage);
    // the stations and their lamps, found by name once they exist
    const r = root.current;
    if (!r) return;
    stations.current = LINE_STATIONS.map((_, i) => (r.getObjectByName(`station-${i}`) as Group | undefined) ?? null);
    lamps.current = LINE_STATIONS.map((_, i) => (r.getObjectByName(`lamp-${i}`) as Mesh | undefined) ?? null);
  }, []);

  const onOver = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (line.get().hover !== i) {
      line.set({ hover: i });
      sfx.tick();
    }
    ui.set({ glCursor: "open", glCursorLabel: LINE_STATIONS[i]!.name });
  };
  const onOut = (i: number) => () => {
    if (line.get().hover === i) line.set({ hover: -1 });
    ui.set({ glCursor: null, glCursorLabel: "" });
  };
  const onClick = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    // a click on the copy or a control above the canvas is not a click on the machine
    const target = e.nativeEvent.target as Element | null;
    if (target?.closest("button, a, input, label, [role='slider'], [data-no-gl]")) return;
    e.stopPropagation();
    const s = LINE_STATIONS[i]!;
    line.set((st) => ({ jump: { id: s.id, n: st.jump.n + 1 } }));
  };

  useEffect(
    () => () => {
      ui.set({ glCursor: null, glCursorLabel: "" });
      line.set({ hover: -1 });
    },
    [],
  );

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const t = state.clock.elapsedTime;
    const reduced = prefersReducedMotion();
    const ls = line.get();
    const g = gl.get();
    mats.belt.uniforms.uTime!.value = reduced ? 0 : t;

    // --- Aarav's token glides to his station; arriving there sets things moving
    const tx = SX[ls.station] ?? SX[0]!;
    const tk = springStep(sim.token.x, sim.token.v, tx, TOKEN, dt);
    sim.token.x = reduced ? tx : tk[0];
    sim.token.v = reduced ? 0 : tk[1];
    if (ls.station !== sim.lastStation && Math.abs(sim.token.x - tx) < 0.6) {
      sim.lastStation = ls.station;
      if (ls.station === 1) sim.arm.target += (Math.PI * 2) / 3;
      if (ls.station === 3) sim.flip.target = sim.flip.target ? 0 : 0.5;
      if (ls.station === 4) sim.sendPulse = [1, 0.6, 0.3];
      sfx.clink();
    }
    if (token.current) {
      token.current.position.set(sim.token.x, DROP_Y + 0.55 + Math.sin(t * 2.2) * 0.12, 0);
      token.current.rotation.y = t * 0.8;
    }
    if (tokenGlow.current) {
      const s = 4.2 + Math.sin(t * 3) * 0.3;
      tokenGlow.current.scale.set(s, s, s);
    }

    // --- the stations: hover lifts them; the lamp over each fires in sequence
    const fire = reduced ? -1 : Math.floor(t * 1.6) % (LINE_STATIONS.length + 2);
    stations.current.forEach((grp, i) => {
      if (!grp) return;
      const want = ls.hover === i ? 1.1 : ls.station === i ? 0.35 : 0;
      const next = springStep(sim.lift[i]!.y, sim.lift[i]!.v, want, LIFT, dt);
      sim.lift[i]!.y = reduced ? want : next[0];
      sim.lift[i]!.v = reduced ? 0 : next[1];
      grp.position.y = sim.lift[i]!.y;
      const lamp = lamps.current[i];
      if (lamp) lamp.material = ls.station === i || ls.hover === i || fire === i ? mats.lumen : mats.lampOff;
    });

    // Collect: the scan line climbs the arch
    if (scan.current) scan.current.position.y = 0.9 + ((reduced ? 0.4 : t * 0.45) % 1) * 6.6;
    // Identify: the turnstile turns a third when Aarav passes; the lamp says the gate is open
    sim.arm.a += (sim.arm.target - sim.arm.a) * Math.min(1, dt * 5);
    if (arms.current) arms.current.rotation.y = sim.arm.a;
    if (gateLamp.current) gateLamp.current.material = ls.station >= 1 ? mats.lumen : mats.lampOff;
    // Understand: the threshold ring breathes
    if (domeRing.current) {
      const s = 1 + Math.sin(t * 1.4) * 0.03;
      domeRing.current.scale.set(s, s, s);
    }
    // Decide: the flipper throws for the holdout share
    sim.flip.a += (sim.flip.target - sim.flip.a) * Math.min(1, dt * 8);
    if (flipper.current) flipper.current.rotation.y = -0.15 - sim.flip.a;
    // Send: rings ripple out from the mast; screens light
    rings.current.forEach((r, i) => {
      if (!r) return;
      const phase = reduced ? 0.3 + i * 0.25 : (t * 0.6 + i / 3) % 1;
      const s = 0.4 + phase * 3.4;
      r.scale.set(s, s, s);
      (r.material as MeshBasicMaterial).opacity = (1 - phase) * 0.7;
    });
    sim.sendPulse = sim.sendPulse.map((p) => Math.max(0, p - dt * 0.6));

    // --- the drops ride the belt
    let onBelt = 0;
    const im = drops.current;
    if (im) {
      sim.items.forEach((d, i) => {
        // each drop keeps its own pace, a little faster or slower than the belt
        if (!reduced) d.x += SPEED * dt * (0.36 + (i % 5) * 0.03);
        d.flash = Math.max(0, d.flash - dt * 2.5);
        let y = DROP_Y;
        // a messaged drop flashes as it passes Send
        if (d.lane === 0 && d.x > SX[4]! - 0.4 && d.x < SX[4]! + 0.4 && d.flash < 0.5) {
          d.flash = 1;
          sim.sendPulse[Math.floor(Math.random() * 3)] = 1;
        }
        // the end of the line: the drop falls into its column, and orders or not
        if (d.x > BELT_END - 1.2) {
          d.fall += dt * 2.2;
          y -= d.fall * d.fall * 6;
          if (d.fall > 0.6) {
            const rate = d.lane === 0 ? RATE_M : RATE_H;
            const o = sim.orders;
            if (d.lane === 0) {
              o.mn++;
              if (Math.random() < rate) o.m++;
            } else {
              o.hn++;
              if (Math.random() < rate) o.h++;
            }
            if (d.lane === 0) line.set((s) => ({ messaged: s.messaged + 1 }));
            else line.set((s) => ({ heldOut: s.heldOut + 1 }));
            d.x = BELT_START;
            d.fall = 0;
            // the holdout is decided at random, about one in ten, as in the model
            d.lane = Math.random() < 0.1 ? 1 : 0;
          }
        } else onBelt++;
        const z = routeZ(d.x, d.lane);
        tmp.o.position.set(d.x, y, z);
        const s = 0.27 + d.flash * 0.16;
        tmp.o.scale.set(s, s, s);
        tmp.o.updateMatrix();
        im.setMatrixAt(i, tmp.o.matrix);
        // held-out drops stay dim: nobody messages them
        const b = d.lane === 1 && d.x > SPLIT_X ? 0.55 : 1.6 + d.flash * 2.2;
        tmp.c.copy(C.lumen).multiplyScalar(b);
        im.setColorAt(i, tmp.c);
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    if (Math.round(t * 4) % 4 === 0 && ls.onBelt !== onBelt) line.set({ onBelt });

    // --- Measure: each column fills to its measured order rate
    const o = sim.orders;
    // until enough drops have arrived, lean on the model so the columns are not empty at load
    const prior = 40;
    const lm = Math.min(1, ((o.m + RATE_M * prior) / (o.mn + prior)) / FULL_RATE);
    const lh = Math.min(1, ((o.h + RATE_H * prior) / (o.hn + prior)) / FULL_RATE);
    const sm = springStep(o.levelM, o.vm, lm, TOKEN, dt);
    o.levelM = sm[0];
    o.vm = sm[1];
    const sh = springStep(o.levelH, o.vh, lh, TOKEN, dt);
    o.levelH = sh[0];
    o.vh = sh[1];
    if (fillM.current) {
      fillM.current.scale.y = Math.max(0.01, o.levelM);
      fillM.current.position.y = 0.3 + (6.2 * Math.max(0.01, o.levelM)) / 2;
    }
    if (fillH.current) {
      fillH.current.scale.y = Math.max(0.01, o.levelH);
      fillH.current.position.y = 0.3 + (6.2 * Math.max(0.01, o.levelH)) / 2;
    }
    screens.current.forEach((sc, i) => {
      if (sc) (sc.material as MeshBasicMaterial).color.copy(C.lumen).multiplyScalar(0.22 + (sim.sendPulse[i] ?? 0) * 1.6);
    });

    // --- anchors for the DOM labels
    const r = root.current;
    if (r) {
      r.updateMatrixWorld();
      LINE_STATIONS.forEach((s, i) => {
        anchors[`line-${s.id}`]!.set(SX[i]! + 4.2, 6.2 + sim.lift[i]!.y, -3.8).applyMatrix4(r.matrixWorld);
      });
      anchors["line-token"]!.set(sim.token.x, DROP_Y + 1.6, 0).applyMatrix4(r.matrixWorld);
    }

    // --- camera: a slow dolly along the line, closer as the hero scrolls away
    const aspect = size.width / size.height;
    const portrait = aspect < 1;
    const p = g.progress;
    const dolly = reduced ? 0 : Math.sin(t * 0.07) * 7;
    // the machine sits low and to the right, receding; the copy keeps the top left
    if (portrait) {
      tmp.want.set(-10 + dolly * 0.4, 96 - p * 14, 92 - p * 14);
      tmp.look.set(4, 10, -16);
    } else {
      tmp.want.set(-36 + p * 34 + dolly + g.px * 4, 22 + g.py * 3 - p * 4, 84 - p * 18);
      tmp.look.set(-2 + p * 20 + dolly * 0.6, 5.5 - p * 2, -6);
    }
    tmp.want.add(drift(1.4));
    const c = cam.current;
    if (!c.ready) {
      c.pos.copy(tmp.want);
      c.look.copy(tmp.look);
      c.ready = true;
    } else {
      const k = 1 - Math.exp(-dt * 2.4);
      c.pos.lerp(tmp.want, k);
      c.look.lerp(tmp.look, k);
    }
    camera.position.copy(c.pos);
    camera.lookAt(c.look);
    if (root.current) root.current.rotation.y = portrait ? -1.08 : -0.3;
    projectAnchors(camera, anchors, size.width, size.height);
  });


  return (
    <>
      <color attach="background" args={["#09120b"]} />
      <fog attach="fog" args={["#09120b", 70, 190]} />
      <Studio intensity={0.95} />
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]}>
        <Backdrop z={0} size={520} cell={5} lines={0.7} />
      </group>
      <group ref={root} rotation={[0, -0.3, 0]}>
        {/* the belt, its rails and the plinth under it */}
        <mesh position={[(BELT_START + BELT_END) / 2 - 3, BELT_Y, 0]} material={mats.belt}>
          <boxGeometry args={[BELT_END - BELT_START + 6, 0.7, 4.6]} />
        </mesh>
        {[-2.6, 2.6].map((z) => (
          <mesh key={z} position={[(BELT_START + BELT_END) / 2 - 3, BELT_Y + 0.25, z]} material={mats.metal}>
            <boxGeometry args={[BELT_END - BELT_START + 6, 0.5, 0.35]} />
          </mesh>
        ))}
        <mesh position={[(BELT_START + BELT_END) / 2 - 3, -1.2, 0]} material={mats.metalDark}>
          <boxGeometry args={[BELT_END - BELT_START + 8, 2.4, 6.4]} />
        </mesh>
        {/* the holdout lane: a narrower belt that peels off at Decide */}
        <mesh position={[SPLIT_X + 4, BELT_Y - 0.05, HOLD_Z / 2]} rotation={[0, -Math.atan2(HOLD_Z, 8), 0]} material={mats.belt}>
          <boxGeometry args={[Math.hypot(8, HOLD_Z) + 1, 0.6, 2.4]} />
        </mesh>
        <mesh position={[(SPLIT_X + 8 + BELT_END) / 2, BELT_Y - 0.05, HOLD_Z]} material={mats.belt}>
          <boxGeometry args={[BELT_END - SPLIT_X - 8 + 1, 0.6, 2.4]} />
        </mesh>
        <mesh position={[(SPLIT_X + 8 + BELT_END) / 2, -1.2, HOLD_Z]} material={mats.metalDark}>
          <boxGeometry args={[BELT_END - SPLIT_X - 6, 2.4, 3.4]} />
        </mesh>

        {/* 01 Collect: a scanner arch with a line of light climbing it */}
        <group name="station-0">
          <group position={[SX[0]!, 0, 0]}>
            {[-3.3, 3.3].map((z) => (
              <mesh key={z} position={[0, 4.2, z]} material={mats.metal}>
                <boxGeometry args={[0.8, 8, 0.8]} />
              </mesh>
            ))}
            <mesh position={[0, 8.4, 0]} material={mats.metal}>
              <boxGeometry args={[1.1, 0.8, 7.4]} />
            </mesh>
            <mesh position={[0, 4.4, 0]} material={mats.glass}>
              <boxGeometry args={[0.12, 7.2, 5.8]} />
            </mesh>
            <mesh ref={scan} position={[0, 2, 0]} material={mats.lumen}>
              <boxGeometry args={[0.22, 0.08, 5.8]} />
            </mesh>
            {[-1.6, 0, 1.6].map((z) => (
              <mesh key={z} position={[0.7, 7.6, z]} material={mats.metalDark}>
                <boxGeometry args={[0.6, 0.5, 0.6]} />
              </mesh>
            ))}
            <LampPost index={0} mats={mats} />
          </group>
        </group>

        {/* 02 Identify: a turnstile that turns only for a consented shopper */}
        <group name="station-1">
          <group position={[SX[1]!, 0, 0]}>
            <mesh position={[0, 2.2, -3.5]} material={mats.metal}>
              <cylinderGeometry args={[0.55, 0.7, 4.4, 24]} />
            </mesh>
            <group ref={arms} position={[0, 3.2, -3.5]}>
              {[0, 1, 2].map((k) => (
                <mesh key={k} rotation={[0, (k * Math.PI * 2) / 3, 0]} position={[0, 0, 0]} material={mats.metal}>
                  <boxGeometry args={[0.3, 0.3, 7.6]} />
                </mesh>
              ))}
            </group>
            {[-4.6, 4.6].map((x) => (
              <mesh key={x} position={[x * 0.35, 2.6, 3.6]} material={mats.metalDark}>
                <boxGeometry args={[0.5, 5.2, 0.5]} />
              </mesh>
            ))}
            <mesh ref={gateLamp} position={[0, 4.7, -3.5]} material={mats.lampOff}>
              <sphereGeometry args={[0.42, 20, 14]} />
            </mesh>
            <LampPost index={1} mats={mats} />
          </group>
        </group>

        {/* 03 Understand: a glass dome over a hill, a ring at the threshold */}
        <group name="station-2">
          <group position={[SX[2]!, 0, 0]}>
            <mesh position={[0, BELT_Y + 0.4, 0]} material={mats.glass}>
              <sphereGeometry args={[4.4, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh position={[0, BELT_Y + 1.6, -1.2]} material={mats.matte}>
              <coneGeometry args={[2.2, 2.6, 40, 1]} />
            </mesh>
            <mesh ref={domeRing} position={[0, BELT_Y + 2.1, -1.2]} rotation={[Math.PI / 2, 0, 0]} material={mats.lumen}>
              <torusGeometry args={[1.25, 0.045, 8, 64]} />
            </mesh>
            <LampPost index={2} mats={mats} />
          </group>
        </group>

        {/* 04 Decide: a junction with a flipper, and the rule tower beside it */}
        <group name="station-3">
          <group position={[SX[3]!, 0, 0]}>
            <mesh ref={flipper} position={[2.4, BELT_Y + 0.75, 1.2]} material={mats.metal}>
              <boxGeometry args={[4.4, 0.8, 0.22]} />
            </mesh>
            <mesh position={[0, 3, -4]} material={mats.metal}>
              <boxGeometry args={[1.6, 6, 1.6]} />
            </mesh>
            {[1.4, 2.6, 3.8, 5].map((y) => (
              <mesh key={y} position={[0.82, y, -4]} material={y === 3.8 ? mats.lumenSoft : mats.lampOff}>
                <boxGeometry args={[0.06, 0.5, 1.1]} />
              </mesh>
            ))}
            <LampPost index={3} mats={mats} />
          </group>
        </group>

        {/* 05 Send: a mast with three phones, rings rippling out of it */}
        <group name="station-4">
          <group position={[SX[4]!, 0, 0]}>
            <mesh position={[0, 5, -4.2]} material={mats.metal}>
              <cylinderGeometry args={[0.16, 0.22, 10, 12]} />
            </mesh>
            {[0, 1, 2].map((k) => (
              <mesh
                key={k}
                ref={(el) => {
                  rings.current[k] = el;
                }}
                position={[0, 9.6, -4.2]}
                rotation={[Math.PI / 2, 0, 0]}
                material={mats.rings[k]}
              >
                <torusGeometry args={[1, 0.035, 6, 48]} />
              </mesh>
            ))}
            {[-2.3, 0, 2.3].map((x, k) => (
              <group key={x} position={[x, 4.4 + Math.abs(x) * -0.2, -3.2]} rotation={[0, -x * 0.12, 0]}>
                <RoundedBox args={[1.9, 3.6, 0.22]} radius={0.24} smoothness={3} material={mats.metalDark} />
                <mesh
                  ref={(el) => {
                    screens.current[k] = el;
                  }}
                  position={[0, 0, 0.12]}
                  material={mats.screens[k]}
                >
                  <planeGeometry args={[1.6, 3.2]} />
                </mesh>
              </group>
            ))}
            <LampPost index={4} mats={mats} />
          </group>
        </group>

        {/* 06 Measure: two columns filling to their order rates */}
        <group name="station-5">
          <group position={[SX[5]!, 0, 0]}>
            <mesh position={[3, 3.4, 0]} material={mats.glass}>
              <cylinderGeometry args={[2.1, 2.1, 6.8, 40, 1, true]} />
            </mesh>
            <mesh ref={fillM} position={[3, 1, 0]} material={mats.liquid}>
              <cylinderGeometry args={[1.85, 1.85, 6.2, 32]} />
            </mesh>
            <mesh position={[3, 3.4, HOLD_Z]} material={mats.glass}>
              <cylinderGeometry args={[1.4, 1.4, 6.8, 32, 1, true]} />
            </mesh>
            <mesh ref={fillH} position={[3, 1, HOLD_Z]} material={mats.liquidDim}>
              <cylinderGeometry args={[1.18, 1.18, 6.2, 28]} />
            </mesh>
            {[0, HOLD_Z].map((z) => (
              <mesh key={z} position={[3, 0, z]} material={mats.metal}>
                <cylinderGeometry args={[z ? 1.7 : 2.5, z ? 1.8 : 2.6, 0.6, 32]} />
              </mesh>
            ))}
            <LampPost index={5} mats={mats} />
          </group>
        </group>

        {/* picking volumes: the pointer finds stations through these */}
        {SX.map((x, i) => (
          <mesh key={x} position={[x, 4.5, 1]} material={mats.pick} onPointerOver={onOver(i)} onPointerOut={onOut(i)} onClick={onClick(i)}>
            <boxGeometry args={[11, 11, 14]} />
          </mesh>
        ))}

        <instancedMesh ref={drops} args={[undefined, undefined, DROPS]} material={mats.drop}>
          <sphereGeometry args={[1, 14, 10]} />
        </instancedMesh>

        {/* Aarav */}
        <group ref={token}>
          <mesh material={mats.lumen}>
            <sphereGeometry args={[0.62, 28, 18]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.khaki}>
            <torusGeometry args={[1.05, 0.05, 8, 56]} />
          </mesh>
          <mesh ref={tokenGlow} material={mats.glow}>
            <planeGeometry args={[1, 1]} />
          </mesh>
        </group>
      </group>
      <Post bloom={1} threshold={0.82} />
    </>
  );
}

/** A thin post with a lamp at the top: the lamps fire in sequence when the line idles. */
function LampPost({ index, mats }: { index: number; mats: { metalDark: MeshPhysicalMaterial; lampOff: MeshBasicMaterial } }) {
  return (
    <group position={[-4.4, 0, -3.8]}>
      <mesh position={[0, 4.6, 0]} material={mats.metalDark}>
        <cylinderGeometry args={[0.07, 0.07, 9.2, 8]} />
      </mesh>
      <mesh name={`lamp-${index}`} position={[0, 9.4, 0]} material={mats.lampOff}>
        <boxGeometry args={[0.6, 0.36, 0.6]} />
      </mesh>
    </group>
  );
}
