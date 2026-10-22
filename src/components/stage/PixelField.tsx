"use client";

/* eslint-disable react-hooks/immutability -- three.js objects are mutated imperatively every frame; that is the R3F model, not React state. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { stage } from "@/lib/store";
import { onVisitEvent } from "@/lib/telemetry";
import { easeLatch, prefersReducedMotion } from "@/lib/motion";
import { TEAM } from "@/data/team";
import {
  BURSTS,
  FORMATION,
  STATION_SPACING,
  TRAIL,
  fragmentShader,
  vertexShader,
} from "./shaders";
import { bridge } from "./bridge";
import { PORTRAIT_ASPECT, blankTexture, portraitTexture } from "./portraits";

export const MAX_PIXELS = 14400;

const COLORS = {
  bone: new THREE.Color("#c2b897"),
  moss: new THREE.Color("#2a3a2f"),
  signal: new THREE.Color("#ff3d2e"),
  dim: new THREE.Color("#6f6a56"),
};

const SCENE_TO_FORMATION = {
  home: FORMATION.home,
  product: FORMATION.pipeline,
  team: FORMATION.portrait,
  lost: FORMATION.lost,
  quiet: FORMATION.quiet,
} as const;

const MORPH_SECONDS = 1.35;

/**
 * Camera rail for the pipeline: dwell at each station, glide between them. The glide
 * is centred on the half-way point, which is where the DOM label switches station.
 */
const railX = (station: number) => {
  const k = Math.floor(station);
  const f = station - k;
  const e = easeLatch(Math.min(1, Math.max(0, (f - 0.22) / 0.56)));
  return (k + e) * STATION_SPACING;
};

type Props = { count: number };

export function PixelField({ count }: Props) {
  const { size, viewport, camera, gl } = useThree();
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const geometry = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    g.index = quad.index;
    g.setAttribute("position", quad.getAttribute("position"));
    const rand = new Float32Array(MAX_PIXELS * 4);
    const idx = new Float32Array(MAX_PIXELS);
    let s = 1234567;
    const r = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < MAX_PIXELS; i++) {
      rand[i * 4] = r();
      rand[i * 4 + 1] = r();
      rand[i * 4 + 2] = r();
      rand[i * 4 + 3] = r();
      idx[i] = i;
    }
    g.setAttribute("aRand", new THREE.InstancedBufferAttribute(rand, 4));
    g.setAttribute("aIdx", new THREE.InstancedBufferAttribute(idx, 1));
    g.instanceCount = MAX_PIXELS;
    return g;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uRes: { value: new THREE.Vector2(1, 1) },
          uDpr: { value: 1 },
          uCount: { value: count },
          uPointer: { value: new THREE.Vector2(-10, -10) },
          uTrail: { value: Array.from({ length: TRAIL }, () => new THREE.Vector3(-10, -10, 1)) },
          uBursts: { value: Array.from({ length: BURSTS }, () => new THREE.Vector4(-10, -10, 1, 0)) },
          uFormA: { value: FORMATION.quiet },
          uFormB: { value: FORMATION.quiet },
          uMorph: { value: 0 },
          uFade: { value: 0 },
          uScroll: { value: 0 },
          uStation: { value: 0 },
          uConsent: { value: 1 },
          uPortraitA: { value: blankTexture() },
          uPortraitB: { value: blankTexture() },
          uPortraitMix: { value: 0 },
          uPortraitOn: { value: 0 },
          uPortraitAspect: { value: PORTRAIT_ASPECT },
          uScan: { value: -1 },
          uBone: { value: COLORS.bone },
          uMoss: { value: COLORS.moss },
          uSignal: { value: COLORS.signal },
          uDim: { value: COLORS.dim },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    geometry.instanceCount = count;
    material.uniforms.uCount.value = count;
  }, [count, geometry, material]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      (material.uniforms.uPortraitA.value as THREE.Texture).dispose();
      (material.uniforms.uPortraitB.value as THREE.Texture).dispose();
    },
    [geometry, material],
  );

  // Pointer, trail and visit-event bursts.
  const pointer = useRef({ x: -10, y: -10, lastX: -10, lastY: -10 });
  const trail = useRef<{ x: number; y: number; t: number }[]>([]);
  const bursts = useRef<{ x: number; y: number; t: number; s: number }[]>([]);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = pointer.current;
      p.x = e.clientX / window.innerWidth;
      p.y = e.clientY / window.innerHeight;
      const dx = (p.x - p.lastX) * window.innerWidth;
      const dy = (p.y - p.lastY) * window.innerHeight;
      if (dx * dx + dy * dy > 900) {
        trail.current.unshift({ x: p.x, y: p.y, t: performance.now() });
        trail.current.length = Math.min(trail.current.length, TRAIL);
        p.lastX = p.x;
        p.lastY = p.y;
      }
    };
    const offEvent = onVisitEvent((ev) => {
      const p = pointer.current;
      bursts.current.unshift({
        x: ev.x ?? (p.x >= 0 ? p.x : 0.5),
        y: ev.y ?? (p.y >= 0 ? p.y : 0.5),
        t: performance.now(),
        s: ev.name === "click" ? 1 : 0.6,
      });
      bursts.current.length = Math.min(bursts.current.length, BURSTS);
    });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      offEvent();
    };
  }, []);

  // Portraits for the team formation.
  const portraitSlug = useRef("");
  const portraitMix = useRef({ value: 0, target: 0 });
  useEffect(() => {
    // Warm the first silhouette so the team page never waits on it.
    if (TEAM[0]) void portraitTexture(TEAM[0].slug, TEAM[0].photo);
  }, []);

  // Formation morph state.
  const morph = useRef({ from: FORMATION.quiet as number, to: FORMATION.quiet as number, start: 0, active: false });
  const station = useRef(0);
  const fade = useRef(0);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const projected = useMemo(() => new THREE.Vector3(), []);
  const camHome = useMemo(() => new THREE.Vector3(0, 0, 14), []);

  useFrame((state, delta) => {
    const u = material.uniforms;
    const now = performance.now();
    const s = stage.get();
    u.uTime.value = state.clock.elapsedTime;
    u.uRes.value.set(size.width, size.height);
    u.uDpr.value = viewport.dpr;

    // fade the whole field in once, after the first frames are drawn
    fade.current = Math.min(1, fade.current + delta * 1.4);
    u.uFade.value = fade.current;

    // formation morph
    const want = SCENE_TO_FORMATION[s.scene];
    const m = morph.current;
    if (want !== m.to) {
      m.from = m.to;
      m.to = want;
      m.start = now;
      m.active = true;
    }
    if (m.active) {
      const t = reduced ? 1 : Math.min(1, (now - m.start) / (MORPH_SECONDS * 1000));
      u.uFormA.value = m.from;
      u.uFormB.value = m.to;
      u.uMorph.value = t;
      if (t >= 1) {
        m.active = false;
        m.from = m.to;
        u.uFormA.value = m.to;
        u.uMorph.value = 0;
      }
    } else {
      u.uFormA.value = m.to;
      u.uMorph.value = 0;
    }

    // pointer and trail
    const p = pointer.current;
    u.uPointer.value.set(p.x, p.y);
    const trailU = u.uTrail.value as THREE.Vector3[];
    for (let i = 0; i < TRAIL; i++) {
      const pt = trail.current[i];
      if (pt) trailU[i].set(pt.x, pt.y, Math.min(1, (now - pt.t) / 1600));
      else trailU[i].set(-10, -10, 1);
    }
    const burstU = u.uBursts.value as THREE.Vector4[];
    for (let i = 0; i < BURSTS; i++) {
      const b = bursts.current[i];
      if (b && !reduced) burstU[i].set(b.x, b.y, Math.min(1, (now - b.t) / 1500), b.s);
      else burstU[i].set(-10, -10, 1, 0);
    }

    u.uScroll.value = bridge.scroll;
    u.uConsent.value = s.consent ? 1 : 0;
    u.uScan.value = bridge.scan;

    // pipeline camera rail
    // six equal slices of scroll, each centred on its station
    const targetStation = Math.min(5, Math.max(0, s.pipeline * 6 - 0.5));
    station.current += (targetStation - station.current) * Math.min(1, delta * 6);
    u.uStation.value = station.current;
    const pipelineWeight =
      (m.to === FORMATION.pipeline ? 1 : 0) * (m.active ? Number(u.uMorph.value) : 1) +
      (m.from === FORMATION.pipeline && m.active ? 1 - Number(u.uMorph.value) : 0);
    const x = railX(station.current);
    const px = p.x >= 0 ? p.x - 0.5 : 0;
    const py = p.y >= 0 ? p.y - 0.5 : 0;
    // Landscape: the station sits right of the text panel. Portrait: centred, pulled back to fit.
    const aspect = size.width / Math.max(1, size.height);
    const wide = aspect > 1.05;
    const offset = wide ? 4.4 : 0;
    const dist = wide ? 16.5 : THREE.MathUtils.clamp(4.6 / (0.2867 * aspect), 16.5, 42);
    camera.position.set(
      THREE.MathUtils.lerp(camHome.x, x - offset - 1.2 + px * 1.6, pipelineWeight),
      THREE.MathUtils.lerp(camHome.y, (wide ? 1.4 : 0.2) - py * 1.0, pipelineWeight),
      THREE.MathUtils.lerp(camHome.z, dist, pipelineWeight),
    );
    lookAt.set(x - offset + 0.4, wide ? -0.1 : 1.6, 0);
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();

    // project station anchors for the DOM HUD
    for (let k = 0; k < 6; k++) {
      projected.set(k * STATION_SPACING, 3.1, 0).project(camera);
      const a = bridge.anchors[k];
      a.x = (projected.x * 0.5 + 0.5) * size.width;
      a.y = (-projected.y * 0.5 + 0.5) * size.height;
      a.visible = pipelineWeight > 0.5 && projected.z < 1 && Math.abs(projected.x) < 1.1;
    }

    // portraits
    const want2 = bridge.portrait;
    if (want2.slug && want2.slug !== portraitSlug.current) {
      const next = want2.slug;
      portraitSlug.current = next;
      void portraitTexture(next, want2.photo).then((tex) => {
        if (portraitSlug.current !== next) return tex.dispose();
        const pm = portraitMix.current;
        // put the new texture on whichever side is hidden, then sweep to it
        if (pm.target >= 0.5) {
          (u.uPortraitA.value as THREE.Texture).dispose();
          u.uPortraitA.value = tex;
          pm.target = 0;
        } else {
          (u.uPortraitB.value as THREE.Texture).dispose();
          u.uPortraitB.value = tex;
          pm.target = 1;
        }
      });
    }
    const pm = portraitMix.current;
    pm.value += (pm.target - pm.value) * Math.min(1, delta * (reduced ? 30 : 3.2));
    u.uPortraitMix.value = pm.value;
    u.uPortraitOn.value += (want2.on - u.uPortraitOn.value) * Math.min(1, delta * 4);
  });

  useEffect(() => {
    gl.setClearColor("#0a0f0c", 1);
  }, [gl]);

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
