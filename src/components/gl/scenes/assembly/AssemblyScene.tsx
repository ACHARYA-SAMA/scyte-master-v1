"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector3 } from "three";
import { gl } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import { Studio } from "../../Studio";
import { Post } from "../../Post";
import { Backdrop } from "../../Backdrop";
import { C, canvasTexture, makeMetal } from "../../materials";
import { projectAnchors } from "../../anchors";
import { LAYERS, LH, LW, drawFinished, drawLayer } from "./layers";

const PW = 24;
const PH = (PW * LH) / LW;
const GAP = 4.2;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 0..6: how many layers have been added at progress p. */
export const builtAt = (p: number) => Math.min(LAYERS.length, Math.max(0, ((p - 0.12) / 0.62) * LAYERS.length));
/** 0 exploded, 1 collapsed into the finished page. */
export const collapseAt = (p: number) => smooth(0.78, 0.92, p);

/**
 * The Assembly: six planes, one per layer of a real build, exploded along the depth
 * axis. Each lights as scroll adds it; at the end they collapse into the finished
 * page, on a monitor.
 */
export default function AssemblyScene() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const mats = useMemo(
    () =>
      LAYERS.map((l) => new MeshBasicMaterial({ map: canvasTexture(LW, LH, (c) => drawLayer(c, l.id)), transparent: true, toneMapped: false, depthWrite: false })),
    [],
  );
  const finished = useMemo(() => new MeshBasicMaterial({ map: canvasTexture(LW, LH, drawFinished), transparent: true, toneMapped: false }), []);
  const edges = useMemo(() => LAYERS.map(() => new MeshBasicMaterial({ color: C.khaki.clone(), transparent: true, toneMapped: false })), []);
  const metal = useMemo(() => makeMetal("#253026", 0.3), []);
  const planes = useRef<(Mesh | null)[]>([]);
  const frames = useRef<(Mesh | null)[]>([]);
  const stack = useRef<Group>(null);
  const monitor = useRef<Group>(null);
  const finishedRef = useRef<Mesh>(null);
  const cam = useRef({ pos: new Vector3(), look: new Vector3(), ready: false });
  const anchors = useMemo(() => Object.fromEntries(LAYERS.map((l) => [`layer-${l.id}`, new Vector3()])), []);

  useEffect(
    () => () => {
      mats.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
      finished.map?.dispose();
      finished.dispose();
      edges.forEach((m) => m.dispose());
      metal.dispose();
    },
    [mats, finished, edges, metal],
  );

  useFrame((_, dt) => {
    const p = gl.get().progress;
    const built = builtAt(p);
    const col = collapseAt(p);
    const t = performance.now() / 1000;

    LAYERS.forEach((l, i) => {
      const m = planes.current[i];
      const fr = frames.current[i];
      if (!m) return;
      const on = smooth(i, i + 0.6, built);
      const z = (i - (LAYERS.length - 1) / 2) * GAP * (1 - col);
      m.position.set(0, 0, z);
      // a just-added layer drops in from above
      m.position.y = (1 - on) * 6;
      (m.material as MeshBasicMaterial).opacity = on * (1 - col * 0.999);
      if (fr) {
        fr.position.set(0, m.position.y, z - 0.01);
        (fr.material as MeshBasicMaterial).opacity = on * (1 - col);
      }
      anchors[`layer-${l.id}`].set(PW / 2, PH / 2 + m.position.y, z);
      if (stack.current) anchors[`layer-${l.id}`].applyMatrix4(stack.current.matrixWorld);
    });
    if (finishedRef.current) (finishedRef.current.material as MeshBasicMaterial).opacity = col;
    if (monitor.current) monitor.current.visible = col > 0.01;
    if (monitor.current) monitor.current.scale.setScalar(0.94 + col * 0.06);

    // camera: a three-quarter orbit while it builds, square-on once it is finished
    const g = gl.get();
    const reduced = prefersReducedMotion();
    const orbit = (1 - col) * (0.75 + Math.sin(t * 0.2) * (reduced ? 0 : 0.04));
    const R = 54 + (1 - col) * 6;
    const wide = size.width / size.height > 1.2;
    const want = new Vector3(Math.sin(orbit) * R + g.px * 1.5, 6 * (1 - col) + g.py, Math.cos(orbit) * R);
    const look = new Vector3(wide ? -9 * (1 - col) - 6 * col : 0, 0, 0);
    if (!wide) want.multiplyScalar(1.6);
    const c = cam.current;
    if (!c.ready || reduced) {
      c.pos.copy(want);
      c.look.copy(look);
      c.ready = true;
    } else {
      const k = 1 - Math.exp(-dt * 4);
      c.pos.lerp(want, k);
      c.look.lerp(look, k);
    }
    camera.position.copy(c.pos);
    camera.lookAt(c.look);
    stack.current?.updateMatrixWorld();
    projectAnchors(camera, anchors, size.width, size.height);
  });

  return (
    <>
      <color attach="background" args={["#09120b"]} />
      <fog attach="fog" args={["#09120b", 70, 240]} />
      <Studio intensity={1} />
      <Backdrop z={-50} cell={2} />
      <group ref={stack}>
        {LAYERS.map((l, i) => (
          <group key={l.id}>
            <mesh
              ref={(m) => {
                frames.current[i] = m;
              }}
              material={edges[i]}
            >
              <planeGeometry args={[PW + 0.3, PH + 0.3]} />
            </mesh>
            <mesh
              ref={(m) => {
                planes.current[i] = m;
              }}
              material={mats[i]}
              renderOrder={i + 1}
            >
              <planeGeometry args={[PW, PH]} />
            </mesh>
          </group>
        ))}
        <mesh ref={finishedRef} material={finished} renderOrder={20} position={[0, 0, 0.05]}>
          <planeGeometry args={[PW, PH]} />
        </mesh>
      </group>
      {/* the monitor the finished page lands on */}
      <group ref={monitor} visible={false}>
        <RoundedBox args={[PW + 1.6, PH + 1.6, 0.8]} radius={0.4} smoothness={4} position={[0, 0, -0.5]} material={metal} />
        <RoundedBox args={[2.2, 5, 0.8]} radius={0.3} smoothness={3} position={[0, -PH / 2 - 3, -1]} material={metal} />
        <RoundedBox args={[10, 0.6, 5]} radius={0.25} smoothness={3} position={[0, -PH / 2 - 5.6, 0.5]} material={metal} />
      </group>
      <Post bloom={0.5} threshold={0.92} />
    </>
  );
}
