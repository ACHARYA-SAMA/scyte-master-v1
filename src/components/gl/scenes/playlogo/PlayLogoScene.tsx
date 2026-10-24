"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { Box3, Color, ExtrudeGeometry, MeshPhysicalMaterial, PerspectiveCamera, Plane, Quaternion, Vector3 } from "three";
import { CENTERLINES, DEPTH, glyphShapes, toWorld, type LineKey } from "@/lib/logo/three";
import { prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { gl } from "@/lib/store";
import { Studio } from "../../Studio";
import { Post } from "../../Post";
import { playlogo } from "./playlogo";

/** Which centrelines make up each letter's collider. */
const LINES: LineKey[][] = [["S"], ["C"], ["Ystem", "Yfail", "Ypaid"], ["T"], ["Espine", "Etop", "Emid", "Ebottom"]];
const STROKE = 5;
const FLOOR = -23;
const REST_MS = 4000;
const RETURN_S = 1.1;
/** rapier's body types */
const DYNAMIC = 0;
const KINEMATIC = 2;

type Letter = {
  geometry: ExtrudeGeometry;
  home: Vector3;
  boxes: { pos: [number, number, number]; half: [number, number, number]; rot: [number, number, number] }[];
};

/** Each glyph centred on its own box, with cuboids along its strokes: the letter as a body. */
const buildLetters = (): Letter[] =>
  glyphShapes().map((shape, i) => {
    const g = new ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.16, bevelOffset: -0.16, bevelSegments: 2, curveSegments: 1 });
    g.translate(0, 0, -DEPTH / 2);
    const box = new Box3().setFromBufferAttribute(g.getAttribute("position") as never);
    const home = box.getCenter(new Vector3());
    g.translate(-home.x, -home.y, 0);
    g.computeVertexNormals();
    const boxes: Letter["boxes"] = [];
    for (const key of LINES[i]!) {
      const pts = CENTERLINES[key].map(([x, y]) => toWorld(x, y));
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1]!;
        const b = pts[k]!;
        const len = a.distanceTo(b);
        boxes.push({
          pos: [(a.x + b.x) / 2 - home.x, (a.y + b.y) / 2 - home.y, 0],
          half: [len / 2 + STROKE / 2, STROKE / 2, DEPTH / 2],
          rot: [0, 0, Math.atan2(b.y - a.y, b.x - a.x)],
        });
      }
    }
    return { geometry: g, home, boxes };
  });

/**
 * K7, the playable logo: the wordmark's five letters as rigid bodies, extruded from the
 * exact outlines. Grab one and throw it, stack them, knock them over. After four
 * seconds at rest (or on Put it back) they glide home, and at rest the name is exact.
 */
export default function PlayLogoScene() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const letters = useMemo(() => buildLetters(), []);
  // satin khaki metal: no brushed map, so the faces read clean at any angle
  const metal = useMemo(() => new MeshPhysicalMaterial({ color: new Color("#cfc7aa"), metalness: 0.35, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.18, envMapIntensity: 1.2 }), []);
  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const st = useRef({ mode: "home" as "home" | "free" | "returning", grab: -1, restSince: 0, back: 0, from: [] as { p: Vector3; q: Quaternion }[], knock: 0, reset: 0, homed: false });
  const tmp = useMemo(() => ({ plane: new Plane(new Vector3(0, 0, 1), 0), hit: new Vector3(), q: new Quaternion(), q0: new Quaternion(), v: new Vector3() }), []);

  useEffect(
    () => () => {
      letters.forEach((l) => l.geometry.dispose());
      metal.dispose();
    },
    [letters, metal],
  );

  const freeAll = () => {
    const c = st.current;
    if (c.mode === "free") return;
    c.mode = "free";
    c.restSince = 0;
    bodies.current.forEach((b) => b?.setBodyType(DYNAMIC as never, true));
    playlogo.set({ mode: "free" });
  };

  // a let-go anywhere on the page ends the drag; the letter keeps its velocity: the throw
  useEffect(() => {
    const up = () => {
      if (st.current.grab >= 0) {
        st.current.grab = -1;
        playlogo.set((s) => ({ throws: s.throws + 1 }));
        sfx.slice();
      }
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const grab = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    freeAll();
    st.current.grab = i;
    sfx.clink();
  };

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const c = st.current;
    const s = playlogo.get();

    // the camera: square on, the name a little under two thirds of the width
    const aspect = size.width / size.height;
    const halfW = 140 * (aspect < 1 ? 0.62 : 0.85);
    const dist = halfW / aspect / Math.tan((camera.fov * Math.PI) / 360);
    camera.position.set(0, 4 + gl.get().py * 2, dist);
    camera.lookAt(0, -2, 0);

    // place every body at home once, as kinematic: the exact logo before anyone touches it
    if (!c.homed && bodies.current.every(Boolean)) {
      c.homed = true;
      bodies.current.forEach((b, i) => {
        b!.setBodyType(KINEMATIC as never, true);
        b!.setNextKinematicTranslation(letters[i]!.home);
      });
    }

    // the buttons
    if (s.knock !== c.knock) {
      c.knock = s.knock;
      freeAll();
      // impulses scaled by each letter's mass, so every letter flies the same way whatever its size
      bodies.current.forEach((b, i) => {
        if (!b) return;
        const m = b.mass();
        b.applyImpulse({ x: m * ((i - 2) * 9 + (Math.random() - 0.5) * 14), y: m * (34 + Math.random() * 22), z: 0 }, true);
        b.applyTorqueImpulse({ x: 0, y: 0, z: m * 260 * (Math.random() - 0.5) }, true);
      });
      sfx.relay();
    }
    if (s.reset !== c.reset) {
      c.reset = s.reset;
      if (c.mode === "free") c.restSince = -1;
    }

    if (c.mode === "free") {
      // dragging: the held letter chases the pointer on the logo's plane
      if (c.grab >= 0) {
        const b = bodies.current[c.grab];
        state.raycaster.setFromCamera(state.pointer, camera);
        if (b && state.raycaster.ray.intersectPlane(tmp.plane, tmp.hit)) {
          const p = b.translation();
          tmp.v.set(tmp.hit.x - p.x, tmp.hit.y - p.y, 0).multiplyScalar(14);
          b.setLinvel(tmp.v, true);
          const w = b.angvel();
          b.setAngvel({ x: 0, y: 0, z: w.z * 0.85 }, true);
        }
        c.restSince = 0;
      }
      const still = bodies.current.every((b) => {
        if (!b) return true;
        const v = b.linvel();
        const w = b.angvel();
        return Math.hypot(v.x, v.y) < 0.4 && Math.abs(w.z) < 0.4;
      });
      // the scene's clock, in ms: rest is measured in frames the visitor saw
      const now = state.clock.elapsedTime * 1000;
      if (c.restSince === -1 || (still && c.grab < 0 && c.restSince && now - c.restSince > REST_MS)) {
        // home: from wherever they lie, on a glide
        c.mode = "returning";
        c.back = 0;
        c.from = bodies.current.map((b) => {
          const t = b!.translation();
          const r = b!.rotation();
          b!.setBodyType(KINEMATIC as never, true);
          return { p: new Vector3(t.x, t.y, t.z), q: new Quaternion(r.x, r.y, r.z, r.w) };
        });
        playlogo.set({ mode: "returning" });
      } else if (still && c.grab < 0) {
        if (!c.restSince) c.restSince = now;
      } else c.restSince = 0;
    } else if (c.mode === "returning") {
      c.back = Math.min(1, c.back + dt / (prefersReducedMotion() ? 0.01 : RETURN_S));
      const k = c.back * c.back * (3 - 2 * c.back);
      bodies.current.forEach((b, i) => {
        const f = c.from[i];
        if (!b || !f) return;
        tmp.v.copy(f.p).lerp(letters[i]!.home, k);
        b.setNextKinematicTranslation(tmp.v);
        tmp.q.copy(f.q).slerp(tmp.q0.identity(), k);
        b.setNextKinematicRotation(tmp.q);
      });
      if (c.back >= 1) {
        c.mode = "home";
        playlogo.set({ mode: "home" });
        sfx.clink();
      }
    }
  });

  return (
    <>
      <color attach="background" args={["#09120b"]} />
      <Studio intensity={1.1} />
      <ambientLight intensity={0.3} color="#cfc7aa" />
      {/* a warm key from above left and a cool rim behind: the faces read, the edges shine */}
      <directionalLight position={[-60, 90, 140]} intensity={2.4} color="#e6d5b8" />
      <directionalLight position={[80, 30, -80]} intensity={1.2} color="#cfc7aa" />
      <Physics gravity={[0, -60, 0]} timeStep="vary">
        {letters.map((l, i) => (
          <RigidBody
            key={i}
            ref={(b) => void (bodies.current[i] = b)}
            type="kinematicPosition"
            colliders={false}
            position={[l.home.x, l.home.y, 0]}
            enabledRotations={[false, false, true]}
            enabledTranslations={[true, true, false]}
            linearDamping={0.3}
            angularDamping={0.8}
            friction={0.9}
            restitution={0.15}
          >
            {l.boxes.map((b, k) => (
              <CuboidCollider key={k} args={b.half} position={b.pos} rotation={b.rot} />
            ))}
            <mesh geometry={l.geometry} material={metal} onPointerDown={grab(i)} />
          </RigidBody>
        ))}
        {/* the floor and two walls keep the letters on the page */}
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[200, 2, 20]} position={[0, FLOOR - 2, 0]} />
          <CuboidCollider args={[2, 120, 20]} position={[-102, 60, 0]} />
          <CuboidCollider args={[2, 120, 20]} position={[102, 60, 0]} />
        </RigidBody>
      </Physics>
      <mesh position={[0, FLOOR, -6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[260, 40]} />
        <meshStandardMaterial color="#0e1810" roughness={0.6} metalness={0.2} />
      </mesh>
      <Post bloom={0.4} threshold={1} />
    </>
  );
}
