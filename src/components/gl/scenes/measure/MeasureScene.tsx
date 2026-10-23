"use client";
/* eslint-disable react-hooks/purity -- the drops' positions and fates are random on purpose. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { BoxGeometry, Color, InstancedMesh, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, Object3D, PerspectiveCamera, SphereGeometry, Vector3 } from "three";
import { gl } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import { Studio } from "../../Studio";
import { Post } from "../../Post";
import { Backdrop } from "../../Backdrop";
import { C, makeGlass, makeMetal } from "../../materials";
import { projectAnchors } from "../../anchors";
import { P0, P1, groupSizes, measure, sampleWeek } from "./measure";

const H = 46;
const COLS = { messaged: -17, holdout: 17 };
/** world units per percentage point of order rate */
const SCALE = 5.2;
const PER_COL = 200;

type Drop = { x: number; y: number; z: number; v: number; buys: boolean; lit: number };

function Stream({ x, rate, width }: { x: number; rate: () => number; width: () => number }) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new SphereGeometry(0.34, 12, 10), []);
  const material = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), []);
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const drops = useMemo<Drop[]>(
    () => Array.from({ length: PER_COL }, () => ({ x: 0, y: Math.random() * H - H / 2, z: 0, v: 9 + Math.random() * 6, buys: false, lit: 0 })),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame((_, rawDt) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(rawDt, 1 / 20);
    const w = width();
    drops.forEach((d, i) => {
      d.y -= d.v * dt;
      if (d.y < -H / 2) {
        d.y = H / 2 + Math.random() * 4;
        d.x = (Math.random() - 0.5) * w;
        d.z = (Math.random() - 0.5) * 5;
        // whether this shopper orders, at the group's true rate
        d.buys = Math.random() < rate();
        d.lit = 0;
      }
      // the order happens at the middle line
      if (d.buys && d.y < 0) d.lit = Math.min(1, d.lit + dt * 6);
      dummy.position.set(x + d.x, d.y, d.z);
      const s = d.buys && d.y < 0 ? 1.5 : 1;
      dummy.scale.set(s, s * (1 + d.v * 0.04), s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      color.copy(C.line).lerp(C.lumen, d.lit).multiplyScalar(d.lit > 0 ? 1 + d.lit * 2.2 : 1.3);
      m.setColorAt(i, color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geometry, material, PER_COL]} frustumCulled={false} />;
}

export default function MeasureScene() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const glass = useMemo(() => makeGlass({ thickness: 2, roughness: 0.1 }), []);
  const metal = useMemo(() => makeMetal("#253026", 0.32), []);
  const bar = useMemo(() => new MeshBasicMaterial({ color: C.lumen.clone().multiplyScalar(1.9), toneMapped: false }), []);
  const barDim = useMemo(() => new MeshBasicMaterial({ color: C.khaki.clone().multiplyScalar(0.9), toneMapped: false }), []);
  const band = useMemo(
    () => new MeshPhysicalMaterial({ color: new Color("#e6d5b8"), transmission: 0.6, roughness: 0.25, transparent: true, opacity: 0.32, depthWrite: false }),
    [],
  );
  const unit = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const refs = useRef<{ m: Mesh | null; h: Mesh | null; d: Mesh | null; b: Mesh | null; hg: Mesh | null }>({ m: null, h: null, d: null, b: null, hg: null });
  const shown = useRef({ p1: P1, p0: P0, lo: 0, hi: 0 });
  const lastWeek = useRef(0);
  const cam = useRef({ pos: new Vector3(0, 6, 92), look: new Vector3(), ready: false });
  const anchors = useMemo(() => ({ messaged: new Vector3(), holdout: new Vector3(), diff: new Vector3() }), []);

  useEffect(
    () => () => {
      glass.dispose();
      metal.dispose();
      bar.dispose();
      barDim.dispose();
      band.dispose();
      unit.dispose();
    },
    [glass, metal, bar, barDim, band, unit],
  );

  useFrame((_, dt) => {
    const now = performance.now();
    if (now - lastWeek.current > 2600) {
      lastWeek.current = now;
      sampleWeek();
    }
    const s = measure.get();
    const { result } = groupSizes(s.holdoutPct);
    const k = Math.min(1, dt * 3);
    const sh = shown.current;
    sh.p1 += (s.p1 - sh.p1) * k;
    sh.p0 += (s.p0 - sh.p0) * k;
    const lo = result.lift.measurable ? result.lift.lo : 0;
    const hi = result.lift.measurable ? result.lift.hi : 0;
    sh.lo += (lo - sh.lo) * k;
    sh.hi += (hi - sh.hi) * k;

    const base = -H / 2 + 0.5;
    const setBar = (m: Mesh | null, x: number, from: number, to: number, w: number) => {
      if (!m) return;
      const h = Math.max(0.05, to - from);
      m.scale.set(w, h, w);
      m.position.set(x, base + from + h / 2, 0);
    };
    const r1 = sh.p1 * 100 * SCALE;
    const r0 = sh.p0 * 100 * SCALE;
    setBar(refs.current.m, COLS.messaged, 0, r1, 7.4);
    setBar(refs.current.h, COLS.holdout, 0, r0, 7.4);
    // the difference: only the incremental part, standing on the holdout's level
    setBar(refs.current.d, 0, r0, r1, 2.2);
    setBar(refs.current.b, 0, r0 + Math.max(0, sh.lo) * 100 * SCALE, r0 + sh.hi * 100 * SCALE, 4.4);
    // the holdout column narrows with its share of shoppers
    const share = s.holdoutPct / 100;
    if (refs.current.hg) refs.current.hg.scale.set(0.45 + share * 2.2, 1, 1);

    anchors.messaged.set(COLS.messaged, base + r1 + 2, 0);
    anchors.holdout.set(COLS.holdout, base + r0 + 2, 0);
    anchors.diff.set(0, base + r1 + 3, 0);

    const g = gl.get();
    const wide = size.width / size.height > 1.2;
    const want = new Vector3((wide ? -24 : 0) + g.px * 6, 4 + g.py * 3, wide ? 112 : 96);
    const look = new Vector3(wide ? -24 : 0, -2, 0);
    const aspect = size.width / size.height;
    if (aspect < 1.2) want.sub(look).multiplyScalar(Math.min(2.1, 1.35 / aspect)).add(look);
    const c = cam.current;
    if (!c.ready || prefersReducedMotion()) {
      c.pos.copy(want);
      c.look.copy(look);
      c.ready = true;
    } else {
      const kk = 1 - Math.exp(-dt * 4);
      c.pos.lerp(want, kk);
      c.look.lerp(look, kk);
    }
    camera.position.copy(c.pos);
    camera.lookAt(c.look);
    projectAnchors(camera, anchors, size.width, size.height);
  });

  const rateMessaged = () => P1;
  const rateHoldout = () => P0;
  const widthM = () => 7;
  const widthH = () => 1.2 + (measure.get().holdoutPct / 100) * 13;

  return (
    <>
      <color attach="background" args={["#09120b"]} />
      <fog attach="fog" args={["#09120b", 80, 280]} />
      <Studio intensity={1.05} />
      <Backdrop z={-30} cell={2} />
      {/* two glass columns: the same store, two groups */}
      <mesh position={[COLS.messaged, 0, 0]} material={glass}>
        <boxGeometry args={[9, H, 7]} />
      </mesh>
      <mesh ref={(m) => void (refs.current.hg = m)} position={[COLS.holdout, 0, 0]} material={glass}>
        <boxGeometry args={[9, H, 7]} />
      </mesh>
      {/* the order line */}
      <RoundedBox args={[56, 0.25, 9]} radius={0.1} smoothness={2} position={[0, 0, 0]} material={metal} />
      <RoundedBox args={[56, 1, 10]} radius={0.3} smoothness={3} position={[0, -H / 2 - 0.4, 0]} material={metal} />
      <Stream x={COLS.messaged} rate={rateMessaged} width={widthM} />
      <Stream x={COLS.holdout} rate={rateHoldout} width={widthH} />
      {/* measured rates, and the difference layer between them */}
      <mesh ref={(m) => void (refs.current.m = m)} geometry={unit} material={barDim} position={[COLS.messaged, -H / 2, -6]} />
      <mesh ref={(m) => void (refs.current.h = m)} geometry={unit} material={barDim} position={[COLS.holdout, -H / 2, -6]} />
      <mesh ref={(m) => void (refs.current.b = m)} geometry={unit} material={band} renderOrder={4} />
      <mesh ref={(m) => void (refs.current.d = m)} geometry={unit} material={bar} />
      <Post bloom={0.9} threshold={0.85} />
    </>
  );
}
