"use client";
/* eslint-disable react-hooks/immutability -- three.js and Rapier objects are created once and driven every frame; that is how R3F physics scenes run without re-rendering. */
/* eslint-disable react-hooks/purity -- token labels and spawn jitter are random on purpose. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { Euler, MeshBasicMaterial, Plane, Quaternion, Raycaster, Vector2, Vector3, type PerspectiveCamera } from "three";
import { gl, ui } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import { prefersReducedMotion } from "@/lib/motion";
import { Studio } from "../../Studio";
import { Post } from "../../Post";
import { Backdrop } from "../../Backdrop";
import { C, canvasTexture, makeMatte, makeMetal, siteFont } from "../../materials";
import { identity } from "./identity";

const GATE_X = 4;
const MAX_TOKENS = 14;
const EVENTS = ["page_view", "product_view", "engaged_time", "size_chart_open", "review_scroll", "add_to_cart", "checkout_started"];

const tokenTexture = (event: string, id: string) =>
  canvasTexture(512, 192, (ctx) => {
    ctx.fillStyle = "#cfc7aa";
    ctx.fillRect(0, 0, 512, 192);
    ctx.fillStyle = "#1b261d";
    ctx.fillRect(0, 0, 18, 192);
    ctx.font = `700 46px ${siteFont()}`;
    ctx.fillStyle = "#1b261d";
    ctx.fillText(event, 44, 86);
    ctx.font = `500 34px ${siteFont()}`;
    ctx.fillStyle = "#334638";
    ctx.fillText(`anonymous ${id}`, 44, 146);
  });

type Token = { key: number; event: string; id: string };

let nextKey = 1;
const makeToken = (): Token => ({
  key: nextKey++,
  event: EVENTS[Math.floor(Math.random() * EVENTS.length)],
  id: Math.random().toString(16).slice(2, 6),
});

function TokenBody({ token, onGone, grab }: { token: Token; onGone: (k: number) => void; grab: (b: RapierRigidBody) => void }) {
  const body = useRef<RapierRigidBody>(null);
  const face = useMemo(() => new MeshBasicMaterial({ map: tokenTexture(token.event, token.id), toneMapped: false }), [token]);
  const metal = useMemo(() => makeMetal("#2b3a2f", 0.3), []);
  const done = useRef(false);
  const start = useMemo(() => [-26 + Math.random() * 4, 9 + Math.random() * 5, (Math.random() - 0.5) * 2.4] as [number, number, number], []);
  useEffect(
    () => () => {
      face.map?.dispose();
      face.dispose();
      metal.dispose();
    },
    [face, metal],
  );
  useFrame(() => {
    const b = body.current;
    if (!b || done.current) return;
    const t = b.translation();
    // through the gate: this event now belongs to a known, consenting shopper
    if (t.x > GATE_X + 5) {
      done.current = true;
      identity.set((s) => ({ merged: s.merged + 1 }));
      sfx.ok();
      onGone(token.key);
    }
    if (t.y < -30) {
      done.current = true;
      onGone(token.key);
    }
  });
  return (
    <RigidBody ref={body} position={start} rotation={[0, 0, (Math.random() - 0.5) * 0.6]} linearVelocity={[7 + Math.random() * 3, 0, 0]} colliders={false} linearDamping={0.1} angularDamping={0.4} restitution={0.25} friction={0.35}>
      <CuboidCollider args={[1.7, 0.55, 0.85]} />
      <group
        onPointerDown={(e) => {
          e.stopPropagation();
          if (body.current) grab(body.current);
        }}
        onPointerOver={() => ui.set({ glCursor: "drag", glCursorLabel: "Throw" })}
        onPointerOut={() => ui.set({ glCursor: null, glCursorLabel: "" })}
      >
        <RoundedBox args={[3.4, 1.1, 1.7]} radius={0.12} smoothness={3} material={metal} />
        <mesh position={[0, 0, 0.86]} material={face}>
          <planeGeometry args={[3.2, 1.0]} />
        </mesh>
      </group>
    </RigidBody>
  );
}

/** The gate: a brushed-metal turnstile that only turns with consent. */
function Turnstile() {
  const body = useRef<RapierRigidBody>(null);
  // the gate is brushed khaki metal, so it reads against the dark channel
  const metal = useMemo(() => makeMetal("#c2b897", 0.3), []);
  const frame = useMemo(() => makeMetal("#2b3a2f", 0.34), []);
  const lamp = useMemo(() => new MeshBasicMaterial({ color: C.line.clone(), toneMapped: false }), []);
  const angle = useRef(0);
  const shake = useRef(0);
  const q = useMemo(() => new Quaternion(), []);
  const e = useMemo(() => new Euler(), []);
  useEffect(
    () => () => {
      metal.dispose();
      frame.dispose();
      lamp.dispose();
    },
    [metal, frame, lamp],
  );
  useFrame((_, dt) => {
    const s = identity.get();
    const b = body.current;
    if (s.consent) angle.current += dt * 1.6;
    const since = (performance.now() - s.refusedAt) / 1000;
    shake.current = since < 0.5 ? Math.sin(since * 60) * 0.05 * (1 - since / 0.5) : 0;
    e.set(0, 0, angle.current + shake.current);
    q.setFromEuler(e);
    b?.setNextKinematicRotation(q);
    // the lamp: lit with consent, dark without, a blink of cream when it refuses
    const refusing = since < 0.6 && Math.floor(since * 10) % 2 === 0;
    lamp.color.copy(s.consent ? C.lumen : refusing ? C.cream : C.line).multiplyScalar(s.consent ? 2.4 : refusing ? 1.6 : 1);
  });
  return (
    <group position={[GATE_X, 2.4, 0]}>
      <RigidBody ref={body} type="kinematicPosition" colliders={false}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <group key={i} rotation={[0, 0, a]}>
              <CuboidCollider args={[0.7, 3.3, 1.7]} position={[0, 3.6, 0]} />
              <RoundedBox args={[1.4, 6.6, 3.4]} radius={0.3} smoothness={4} position={[0, 3.6, 0]} material={metal} />
            </group>
          );
        })}
        <mesh material={metal} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.5, 1.5, 4.2, 48]} />
        </mesh>
      </RigidBody>
      {/* the frame and its lamp */}
      <RoundedBox args={[1.1, 13, 1.1]} radius={0.2} smoothness={3} position={[0, 3.2, -2.4]} material={frame} />
      <RoundedBox args={[1.1, 13, 1.1]} radius={0.2} smoothness={3} position={[0, 3.2, 2.4]} material={frame} />
      <RoundedBox args={[1.3, 1.1, 6]} radius={0.2} smoothness={3} position={[0, 9.8, 0]} material={frame} />
      <mesh position={[0.7, 9.8, 0]} rotation={[0, Math.PI / 2, 0]} material={lamp}>
        <planeGeometry args={[4.4, 0.32]} />
      </mesh>
    </group>
  );
}

/** Where identified events land: one profile, keyed by phone number. */
function Profile() {
  const face = useMemo(
    () =>
      new MeshBasicMaterial({
        map: canvasTexture(768, 384, (ctx) => {
          ctx.fillStyle = "#e6d5b8";
          ctx.fillRect(0, 0, 768, 384);
          ctx.fillStyle = "#1b261d";
          ctx.fillRect(0, 0, 768, 70);
          ctx.font = `700 34px ${siteFont()}`;
          ctx.fillStyle = "#e6d5b8";
          ctx.fillText("PROFILE", 30, 47);
          ctx.fillStyle = "#1b261d";
          ctx.font = `800 64px ${siteFont()}`;
          ctx.fillText("+91 98••• ••210", 30, 170);
          ctx.font = `500 34px ${siteFont()}`;
          ctx.fillStyle = "#334638";
          ctx.fillText("consent_granted {whatsapp}", 30, 240);
          ctx.fillText("history attached from anonymous", 30, 290);
        }),
        toneMapped: false,
      }),
    [],
  );
  const metal = useMemo(() => makeMetal("#253026", 0.3), []);
  useEffect(
    () => () => {
      face.map?.dispose();
      face.dispose();
      metal.dispose();
    },
    [face, metal],
  );
  return (
    <group position={[GATE_X + 15, 3.2, -1]} rotation={[0, -0.35, 0]}>
      <RoundedBox args={[8.6, 4.6, 0.8]} radius={0.2} smoothness={3} material={metal} />
      <mesh position={[0, 0, 0.42]} material={face}>
        <planeGeometry args={[8.2, 4.1]} />
      </mesh>
    </group>
  );
}

function World() {
  const [tokens, setTokens] = useState<Token[]>(() => Array.from({ length: 6 }, makeToken));
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const grabbed = useRef<RapierRigidBody | null>(null);
  const pointer = useRef(new Vector2());
  const ray = useMemo(() => new Raycaster(), []);
  const plane = useMemo(() => new Plane(new Vector3(0, 0, 1), 0), []);
  const hit = useMemo(() => new Vector3(), []);
  const floor = useMemo(() => makeMatte("#2b3a2f", 0.8), []);
  const glassWall = useMemo(() => makeMatte("#1b261d", 0.9), []);
  const lastSpawn = useRef(0);
  const cam = useRef({ pos: new Vector3(10, 8, 46), look: new Vector3(0, 2, 0), ready: false });

  useEffect(
    () => () => {
      floor.dispose();
      glassWall.dispose();
    },
    [floor, glassWall],
  );

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    };
    const up = () => {
      if (grabbed.current) {
        haptic(10);
        sfx.tick();
      }
      grabbed.current = null;
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  useFrame((_, dt) => {
    // keep a stream of anonymous events arriving from the left
    const now = performance.now();
    if (now - lastSpawn.current > 1100) {
      lastSpawn.current = now;
      setTokens((list) => (list.length >= MAX_TOKENS ? list : [...list, makeToken()]));
    }
    // a grabbed token follows the pointer on the z = 0 plane; letting go throws it
    const g = grabbed.current;
    if (g) {
      ray.setFromCamera(pointer.current, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        const t = g.translation();
        g.setLinvel({ x: (hit.x - t.x) * 9, y: (hit.y - t.y) * 9, z: -t.z * 4 }, true);
      }
    }
    // camera: a slow three-quarter view, a breath of parallax
    const s = gl.get();
    const wide = size.width / size.height > 1.2;
    const want = new Vector3((wide ? -4 : 2) + s.px * 2, 10 + s.py * 1.2, 40);
    const look = new Vector3(wide ? -6 : 0, 2.5, 0);
    const aspect = size.width / size.height;
    if (aspect < 1.2) want.sub(look).multiplyScalar(Math.min(2.1, 1.4 / aspect)).add(look);
    const c = cam.current;
    if (!c.ready || prefersReducedMotion()) {
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
  });

  return (
    <>
      {/* the channel: floor sloping to the gate, a back wall, a front lip */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[40, 0.5, 4]} position={[0, -1.5, 0]} rotation={[0, 0, -0.06]} />
        <CuboidCollider args={[40, 8, 0.5]} position={[0, 6, -4.2]} />
        <CuboidCollider args={[40, 8, 0.5]} position={[0, 6, 4.2]} />
        <CuboidCollider args={[0.5, 10, 4]} position={[-30, 6, 0]} />
        <CuboidCollider args={[0.5, 10, 4]} position={[GATE_X + 22, 6, 0]} />
      </RigidBody>
      <mesh position={[0, -1.5, 0]} rotation={[0, 0, -0.06]} material={floor}>
        <boxGeometry args={[80, 1, 8]} />
      </mesh>
      <mesh position={[0, 1.5, -4.7]} material={glassWall}>
        <boxGeometry args={[80, 7, 0.4]} />
      </mesh>
      <Turnstile />
      <Profile />
      {tokens.map((t) => (
        <TokenBody
          key={t.key}
          token={t}
          onGone={(k) => setTokens((list) => list.filter((x) => x.key !== k))}
          grab={(b) => {
            grabbed.current = b;
            haptic(6);
          }}
        />
      ))}
    </>
  );
}

export default function IdentifyScene() {
  const visible = useStoreVisible();
  return (
    <>
      <color attach="background" args={["#09120b"]} />
      <fog attach="fog" args={["#09120b", 60, 240]} />
      <Studio intensity={1.05} />
      <Backdrop z={-30} cell={2} />
      <Physics gravity={[0, -30, 0]} timeStep="vary" paused={!visible}>
        <World />
      </Physics>
      <Post bloom={0.8} threshold={0.88} />
    </>
  );
}

/** Pause the simulation when the station is off screen. */
const useStoreVisible = () => {
  const [v, setV] = useState(true);
  useEffect(() => gl.subscribe(() => setV(gl.get().visible && gl.get().scene === "identify")), []);
  return v;
};
