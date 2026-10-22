"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas, advance, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { NoToneMapping, SRGBColorSpace } from "three";
import { gsap } from "@/lib/motion";
import { gl as glStore, ui, useStore } from "@/lib/store";
import { SCENES } from "./scenes";
import styles from "./Stage.module.css";

const initialQuality = (): 0 | 1 | 2 => {
  if (document.documentElement.dataset.perf === "low") return 0;
  const cores = navigator.hardwareConcurrency || 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  if (small || cores <= 4) return 1;
  return 2;
};

const maxDpr = (q: number) => {
  const device = window.devicePixelRatio || 1;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const cap = q === 0 ? 1 : small ? 1.5 : 2;
  return Math.min(cap, device);
};

/**
 * Drive R3F from GSAP's ticker: one clock for Lenis, ScrollTrigger and WebGL. Frames
 * are only drawn while the active scene's section is on screen.
 */
function Driver() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let frames = 0;
    let alive = true;
    let compiled = false;
    gl.compileAsync(scene, camera)
      .catch(() => gl.compile(scene, camera))
      .finally(() => {
        compiled = true;
      });
    const tick = () => {
      if (!alive || !compiled) return;
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
  }, [gl, scene, camera]);
  return null;
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
      <Scene key={key} />
    </Suspense>
  );
}

export function Stage() {
  const unsupported = useStore(ui, (s) => s.webgl === "unsupported");
  const perf = useStore(ui, (s) => s.perf);
  const visible = useStore(glStore, (s) => s.visible && s.scene !== "none");
  // client-only (loaded with ssr: false), so initial state may read the device
  const [quality, setQuality] = useState(initialQuality);
  const [dpr, setDpr] = useState(() => maxDpr(initialQuality()));

  useEffect(() => {
    const q = perf === "low" ? 0 : initialQuality();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the visitor's switch overrides the monitor
    setQuality(q);
    setDpr(maxDpr(q));
  }, [perf]);

  useEffect(() => {
    glStore.set({ quality });
  }, [quality]);

  if (unsupported) return null;

  return (
    <div className={styles.stage} data-visible={visible ? "1" : undefined} aria-hidden>
      <Canvas
        frameloop="never"
        dpr={dpr}
        eventSource={typeof document !== "undefined" ? document.body : undefined}
        eventPrefix="client"
        gl={{
          antialias: quality > 0,
          alpha: false,
          stencil: false,
          powerPreference: "high-performance",
          toneMapping: NoToneMapping,
          outputColorSpace: SRGBColorSpace,
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
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => {
            setQuality((q) => (q > 0 ? ((q - 1) as 0 | 1) : 0));
            setDpr((d) => Math.max(1, d - 0.25));
          }}
          onIncline={() => {
            if (ui.get().perf === "low") return;
            setQuality((q) => (q < 2 ? ((q + 1) as 1 | 2) : 2));
          }}
          onFallback={() => {
            setQuality(0);
            setDpr(1);
          }}
        />
        <ActiveScene />
      </Canvas>
    </div>
  );
}
