"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, advance, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { HalfFloatType, NoToneMapping, SRGBColorSpace, WebGLRenderer, WebGLRenderTarget, type Object3D } from "three";
import { gsap } from "@/lib/motion";
import { gl as glStore, ui, useStore } from "@/lib/store";
import { SCENES } from "./scenes";
import { hold, warming } from "./warm";
import styles from "./Stage.module.css";

type Quality = 0 | 1 | 2;

/**
 * What the GPU can carry, from the renderer string of the canvas's own context.
 * Integrated graphics (most laptops) cannot run transmission glass, depth of field and
 * MSAA at full resolution: the home scene took 84 ms a frame on an Intel UHD at
 * quality 2, against 7 ms at quality 0. Unknown GPUs get the middle tier.
 */
let gpuTier: Quality | null = null;

const tierOf = (context: WebGLRenderingContext | WebGL2RenderingContext): Quality => {
  const info = context.getExtension("WEBGL_debug_renderer_info");
  const name = String(context.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : context.RENDERER)).toLowerCase();
  if (/swiftshader|llvmpipe|softpipe|software|basic render/.test(name)) return 0;
  if (/nvidia|geforce|quadro|rtx|apple m\d|apple gpu/.test(name)) return 2;
  // discrete Radeons; the integrated ones read "Radeon(TM) Graphics" or "Vega"
  if (/radeon/.test(name) && !/radeon\(tm\) graphics|vega/.test(name)) return 2;
  return 1;
};

/** `?gl=0|1|2` forces a tier, for testing on one machine. */
const forced = (): Quality | null => {
  const v = new URLSearchParams(window.location.search).get("gl");
  return v === "0" || v === "1" || v === "2" ? (Number(v) as Quality) : null;
};

const initialQuality = (): Quality => {
  if (document.documentElement.dataset.perf === "low") return 0;
  const f = forced();
  if (f !== null) return f;
  const cores = navigator.hardwareConcurrency || 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const cpu: Quality = small || cores <= 4 ? 1 : 2;
  return Math.min(cpu, gpuTier ?? cpu) as Quality;
};

const maxDpr = (q: number) => {
  const device = window.devicePixelRatio || 1;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const cap = q === 0 ? 1 : q === 1 ? (small ? 1.5 : 1) : small ? 1.5 : 2;
  return Math.min(cap, device);
};

/** Glass refracts a copy of the scene; below the top tier that copy is drawn at half size. */
const transmissionScale = (q: number) => (q < 2 ? 0.5 : 1);

/**
 * Drive R3F from GSAP's ticker: one clock for Lenis, ScrollTrigger and WebGL. Frames
 * are only drawn while the active scene's section is on screen.
 */
function Driver() {
  useEffect(() => {
    let frames = 0;
    let alive = true;
    const tick = () => {
      if (!alive || warming()) return;
      const s = glStore.get();
      if ((!s.visible || s.scene === "none") && frames > 2) return;
      advance(performance.now() / 1000);
      frames++;
      if (frames === 2) ui.set({ webgl: "ready" });
    };
    gsap.ticker.add(tick);
    return () => {
      alive = false;
      gsap.ticker.remove(tick);
    };
  }, []);
  return null;
}

/**
 * Compiles a scene's shaders before its first frame. Scenes are lazy, so they mount
 * long after the canvas; without this the first frame compiles every program on the
 * main thread (about a second on Windows, where each shader is also compiled for
 * Direct3D). compileAsync uses the parallel-compile extension where there is one.
 */
function Warm({ children }: { children: ReactNode }) {
  const { gl, scene, camera, get } = useThree();
  useEffect(() => {
    let alive = true;
    const compile = () => {
      if (!alive) return;
      // a scene with the post chain draws into a linear target, and three keys programs on
      // the output colour space: compile for the target the scene will really draw into
      const post = get().internal.priority > 0;
      const target = post ? new WebGLRenderTarget(1, 1, { type: HalfFloatType }) : null;
      const prev = gl.getRenderTarget();
      gl.setRenderTarget(target);
      // three only compiles what is visible; objects a scene reveals later (a monitor
      // that appears at the end, a crack that opens mid-story) would compile on their
      // first draw and freeze the screen for seconds. Show everything for the compile.
      const hidden: Object3D[] = [];
      scene.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
      const compiling = gl.compileAsync(scene, camera);
      hidden.forEach((o) => {
        o.visible = false;
      });
      gl.setRenderTarget(prev);
      target?.dispose();
      return compiling;
    };
    const release = hold(Promise.resolve().then(compile));
    return () => {
      alive = false;
      release();
    };
  }, [gl, scene, camera, get]);
  return <>{children}</>;
}

/** Tracks the pointer for every scene, in normalised device coordinates. */
function Pointer() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      glStore.set({ px: (e.clientX / window.innerWidth) * 2 - 1, py: -(e.clientY / window.innerHeight) * 2 + 1 });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}

function ActiveScene() {
  const key = useStore(glStore, (s) => s.scene);
  const Scene = SCENES[key];
  if (!Scene) return null;
  return (
    <Suspense fallback={null}>
      <Warm key={key}>
        <Scene />
      </Warm>
    </Suspense>
  );
}

/** How long the canvas runs before frame rate is allowed to change its quality. */
const SETTLE_MS = 3500;

export function Stage() {
  const unsupported = useStore(ui, (s) => s.webgl === "unsupported");
  const ready = useStore(ui, (s) => s.webgl === "ready");
  // warm-up frames are slow on every device; judging quality on them would downgrade
  // a fast machine and recompile the post chain a few seconds after load
  const [judging, setJudging] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setJudging(true), SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [ready]);
  const perf = useStore(ui, (s) => s.perf);
  const visible = useStore(glStore, (s) => s.visible && s.scene !== "none");
  // client-only (loaded with ssr: false), so initial state may read the device
  const [quality, setQuality] = useState(initialQuality);
  const [dpr, setDpr] = useState(() => maxDpr(initialQuality()));
  const renderer = useRef<WebGLRenderer | null>(null);
  const stepped = useRef(false);
  const dprRef = useRef(dpr);
  useEffect(() => {
    dprRef.current = dpr;
  }, [dpr]);

  useEffect(() => {
    const q = perf === "low" ? 0 : initialQuality();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the visitor's switch overrides the monitor
    setQuality(q);
    setDpr(maxDpr(q));
  }, [perf]);

  useEffect(() => {
    glStore.set({ quality });
    if (renderer.current) renderer.current.transmissionResolutionScale = transmissionScale(quality);
  }, [quality]);

  if (unsupported) return null;

  return (
    <div className={styles.stage} data-visible={visible ? "1" : undefined} aria-hidden>
      <Canvas
        frameloop="never"
        dpr={dpr}
        eventSource={typeof document !== "undefined" ? document.body : undefined}
        eventPrefix="client"
        gl={(defaults) => {
          const r = new WebGLRenderer({ ...defaults, antialias: true, alpha: false, stencil: false, powerPreference: "high-performance" });
          r.toneMapping = NoToneMapping;
          r.outputColorSpace = SRGBColorSpace;
          // tier the GPU before any scene or post pass mounts, so nothing compiles twice
          gpuTier = tierOf(r.getContext());
          const q = initialQuality();
          r.transmissionResolutionScale = transmissionScale(q);
          glStore.set({ quality: q });
          setQuality(q);
          setDpr(maxDpr(q));
          renderer.current = r;
          return r;
        }}
        camera={{ fov: 30, near: 0.5, far: 800, position: [0, 0, 165] }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            ui.set({ webgl: "unsupported" });
          });
        }}
      >
        <color attach="background" args={["#09120b"]} />
        <Driver />
        <Pointer />
        {judging ? (
          <PerformanceMonitor
            onDecline={() => {
              // resolution first: it costs nothing to change. Quality only once, and never
              // back up: every quality change rebuilds the post chain, and that compile
              // stalls the GPU for seconds, which reads as slow, which flips it again
              if (dprRef.current > 1) setDpr((d) => Math.max(1, d - 0.25));
              else if (!stepped.current) {
                stepped.current = true;
                setQuality((q) => (q > 0 ? ((q - 1) as 0 | 1) : 0));
              }
            }}
            onIncline={() => {
              if (ui.get().perf === "low") return;
              setDpr((d) => Math.min(maxDpr(quality), d + 0.25));
            }}
          />
        ) : null}
        <ActiveScene />
      </Canvas>
    </div>
  );
}
