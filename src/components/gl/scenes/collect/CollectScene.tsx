"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Group, Mesh, MeshBasicMaterial, PerspectiveCamera, ShaderMaterial, Vector2, Vector3 } from "three";
import { gl, ui } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import { Studio } from "../../Studio";
import { Post } from "../../Post";
import { Backdrop } from "../../Backdrop";
import { C, canvasTexture, makeMetal, siteFont } from "../../materials";
import { LAYER_EVENTS, LAYER_RECTS, STORE_H, STORE_W, drawEvents, drawLayer, drawStore, type StoreLayer } from "../../storeCanvas";
import { projectAnchors } from "../../anchors";

const SW = 22.6;
const SH = (SW * STORE_H) / STORE_W;
const U = SW / STORE_W;
const LAYERS: Exclude<StoreLayer, "page">[] = ["image", "title", "sizes", "button", "reviews"];

/** Where each layer flies to when the page comes apart, as [x, y, z] multipliers. */
const SPREAD: Record<(typeof LAYERS)[number], [number, number, number]> = {
  image: [-2.5, 0.6, 3.5],
  title: [2.4, 2.6, 6.5],
  sizes: [3.2, 0.4, 9.5],
  button: [2, -1.6, 12.5],
  reviews: [2.8, -3.6, 15.5],
};

/** 0 assembled, 1 exploded: comes apart through the middle of the station, then back. */
export const explodeAt = (p: number) => {
  const up = Math.min(1, Math.max(0, (p - 0.26) / 0.22));
  const down = Math.min(1, Math.max(0, (p - 0.74) / 0.18));
  const e = up * (1 - down);
  return e * e * (3 - 2 * e);
};

const xrayMaterial = (store: ReturnType<typeof canvasTexture>, events: ReturnType<typeof canvasTexture>) =>
  new ShaderMaterial({
    uniforms: {
      uStore: { value: store },
      uEvents: { value: events },
      uLens: { value: new Vector2(-2, -2) },
      uR: { value: 0 },
      uAspect: { value: STORE_W / STORE_H },
      uRing: { value: C.lumen.clone().multiplyScalar(1.6) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uStore;
      uniform sampler2D uEvents;
      uniform vec2 uLens;
      uniform float uR;
      uniform float uAspect;
      uniform vec3 uRing;
      varying vec2 vUv;
      void main() {
        vec2 d = (vUv - uLens) * vec2(uAspect, 1.0);
        float r = length(d);
        float aa = fwidth(r) * 1.5;
        float inside = 1.0 - smoothstep(uR - aa, uR + aa, r);
        // a little refraction at the rim of the lens
        vec2 bent = vUv + d * 0.06 * smoothstep(uR * 0.6, uR, r) * inside;
        vec3 store = texture2D(uStore, vUv).rgb;
        vec3 events = texture2D(uEvents, bent).rgb;
        vec3 col = mix(store, events, inside);
        float ring = (1.0 - smoothstep(0.0, aa * 2.0, abs(r - uR))) * step(0.001, uR);
        col = mix(col, uRing, ring);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    toneMapped: false,
  });

const tokenTexture = (lines: string[]) =>
  canvasTexture(640, 72 + lines.length * 52, (ctx) => {
    const h = 72 + lines.length * 52;
    ctx.fillStyle = "#152018";
    ctx.fillRect(0, 0, 640, h);
    ctx.strokeStyle = "#c2b897";
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, 637, h - 3);
    ctx.fillStyle = "#f9dc7d";
    ctx.fillRect(18, 22, 14, 14);
    lines.forEach((l, i) => {
      ctx.font = `${i === 0 ? 700 : 500} 34px ${siteFont()}`;
      ctx.fillStyle = i === 0 ? "#e6d5b8" : "#929884";
      ctx.fillText(l, 48, 42 + i * 52 + 10);
    });
  });

export default function CollectScene() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const metal = useMemo(() => makeMetal("#253026", 0.3), []);
  const xray = useMemo(() => xrayMaterial(canvasTexture(STORE_W, STORE_H, drawStore), canvasTexture(STORE_W, STORE_H, drawEvents)), []);
  const pageMat = useMemo(() => new MeshBasicMaterial({ map: canvasTexture(STORE_W, STORE_H, (c) => drawLayer(c, "page")), toneMapped: false }), []);
  const layerMats = useMemo(
    () =>
      LAYERS.map((k) => {
        const [, , w, h] = LAYER_RECTS[k];
        return new MeshBasicMaterial({ map: canvasTexture(w, h, (c) => drawLayer(c, k)), transparent: true, toneMapped: false });
      }),
    [],
  );
  const tokenMats = useMemo(() => LAYERS.map((k) => new MeshBasicMaterial({ map: tokenTexture(LAYER_EVENTS[k]), transparent: true, toneMapped: false })), []);
  const layerRefs = useRef<(Group | null)[]>([]);
  const combined = useRef<Mesh>(null);
  const pageRef = useRef<Mesh>(null);
  const lens = useRef({ u: -2, v: -2, on: 0, r: 0 });
  const cam = useRef({ pos: new Vector3(0, 2, 40), look: new Vector3(0, 0, 0), ready: false });
  const anchors = useMemo(() => Object.fromEntries(LAYERS.map((k) => [`collect-${k}`, new Vector3()])), []);

  useEffect(
    () => () => {
      metal.dispose();
      xray.dispose();
      pageMat.dispose();
      layerMats.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
      tokenMats.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    },
    [metal, xray, pageMat, layerMats, tokenMats],
  );

  useFrame((_, dt) => {
    const p = gl.get().progress;
    const e = explodeAt(p);
    const reduced = prefersReducedMotion();

    // the x-ray lens: only while the page is whole
    const L = lens.current;
    const lensTarget = L.on && e < 0.02 ? 0.17 : 0;
    L.r += (lensTarget - L.r) * Math.min(1, dt * 10);
    xray.uniforms.uLens.value.set(L.u, L.v);
    xray.uniforms.uR.value = L.r;

    if (combined.current) combined.current.visible = e < 0.03;
    if (pageRef.current) pageRef.current.visible = e >= 0.03;

    LAYERS.forEach((k, i) => {
      const g = layerRefs.current[i];
      if (!g) return;
      g.visible = e >= 0.03;
      const [x, y, w, h] = LAYER_RECTS[k];
      const cx = (x + w / 2) * U - SW / 2;
      const cy = SH / 2 - (y + h / 2) * U;
      const [sx, sy, sz] = SPREAD[k];
      g.position.set(cx + sx * e, cy + sy * e, 0.03 + i * 0.002 + sz * e);
      g.rotation.set(0, -0.22 * e, 0);
      const token = g.children[1] as Mesh | undefined;
      if (token) {
        const t = Math.min(1, Math.max(0, (e - 0.35) / 0.4));
        (token.material as MeshBasicMaterial).opacity = t;
        token.position.set(w * U * 0.5 + 4.2, 0, 0.4);
        token.scale.setScalar(0.6 + 0.4 * t);
      }
      anchors[`collect-${k}`].set(cx + sx * e, cy + sy * e, 0.03 + sz * e).applyMatrix4(g.parent?.matrixWorld ?? g.matrixWorld);
    });

    // the camera turns to show the depth of the exploded page
    const want = new Vector3(-9 + e * 16 + gl.get().px * 1.5, 3 + e * 4 + gl.get().py * 1, 48 + e * 4);
    const look = new Vector3(-9 + e * 6, -1 + e * 0.5, e * 6);
    const aspect = size.width / size.height;
    if (aspect < 1.2) want.sub(look).multiplyScalar(Math.min(2.2, 1.35 / aspect)).add(look);
    const c = cam.current;
    if (!c.ready || reduced) {
      c.pos.copy(want);
      c.look.copy(look);
      c.ready = true;
    } else {
      const k = 1 - Math.exp(-dt * 5);
      c.pos.lerp(want, k);
      c.look.lerp(look, k);
    }
    camera.position.copy(c.pos);
    camera.lookAt(c.look);
    projectAnchors(camera, anchors, size.width, size.height);
  });

  return (
    <>
      <color attach="background" args={["#09120b"]} />
      <fog attach="fog" args={["#09120b", 60, 260]} />
      <Studio intensity={1.1} />
      <Backdrop z={-40} cell={2} />
      <group position={[2, -1, 0]} rotation={[0, 0.18, 0]}>
        {/* lid and screen */}
        <group position={[0, -SH / 2 + 0.2, 0]} rotation={[-0.08, 0, 0]}>
          <group position={[0, SH / 2 + 0.4, 0]}>
            <RoundedBox args={[SW + 1.4, SH + 1.3, 0.7]} radius={0.5} smoothness={4} position={[0, 0, -0.37]} material={metal} />
            <mesh
              ref={combined}
              material={xray}
              onPointerMove={(ev) => {
                if (!ev.uv) return;
                lens.current.u = ev.uv.x;
                lens.current.v = ev.uv.y;
                lens.current.on = 1;
              }}
              onPointerOver={() => ui.set({ glCursor: "view", glCursorLabel: "X-ray" })}
              onPointerOut={() => {
                lens.current.on = 0;
                ui.set({ glCursor: null, glCursorLabel: "" });
              }}
            >
              <planeGeometry args={[SW, SH]} />
            </mesh>
            <mesh ref={pageRef} material={pageMat} visible={false}>
              <planeGeometry args={[SW, SH]} />
            </mesh>
            {LAYERS.map((k, i) => {
              const [, , w, h] = LAYER_RECTS[k];
              return (
                <group
                  key={k}
                  ref={(g) => {
                    layerRefs.current[i] = g;
                  }}
                  visible={false}
                >
                  <mesh material={layerMats[i]}>
                    <planeGeometry args={[w * U, h * U]} />
                  </mesh>
                  <mesh material={tokenMats[i]}>
                    <planeGeometry args={[6.4, (6.4 * (72 + LAYER_EVENTS[k].length * 52)) / 640]} />
                  </mesh>
                </group>
              );
            })}
          </group>
        </group>
        {/* base */}
        <RoundedBox args={[SW + 2.4, 1.1, 16]} radius={0.45} smoothness={4} position={[0, -SH / 2 - 0.4, 7.4]} material={metal} />
      </group>
      <Post bloom={0.6} threshold={0.9} />
    </>
  );
}
