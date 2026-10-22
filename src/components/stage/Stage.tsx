"use client";

import { useEffect, useState } from "react";
import { Canvas, advance, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { gsap } from "@/lib/motion";
import { stage, ui, useStore } from "@/lib/store";
import { PixelField } from "./PixelField";
import styles from "./Stage.module.css";

/** Pixel budgets per quality tier. The field degrades effects, never layout. */
const TIERS = [3600, 7200, 14400];

const initialTier = () => {
  const cores = navigator.hardwareConcurrency || 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  if (small || cores <= 4) return 1;
  return 2;
};

/** Drive R3F from GSAP's ticker: one clock for scroll, tweens and WebGL. */
function Driver() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let frames = 0;
    let compiled = false;
    let alive = true;
    // Compile programs off the main thread where the driver allows it
    // (KHR_parallel_shader_compile), so warm-up never blocks scrolling.
    gl.compileAsync(scene, camera)
      .catch(() => gl.compile(scene, camera))
      .finally(() => {
        compiled = true;
      });
    const tick = () => {
      if (!alive || !compiled) return;
      const s = stage.get();
      if (!s.visible && frames > 2) return;
      // frameloop="never": R3F reads this timestamp in seconds
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

export function Stage() {
  const unsupported = useStore(ui, (s) => s.webgl === "unsupported");
  const [tier, setTier] = useState(2);
  const [dpr, setDpr] = useState(1.5);

  useEffect(() => {
    setTier(initialTier());
    setDpr(Math.min(1.75, window.devicePixelRatio || 1));
  }, []);

  if (unsupported) return null;

  return (
    <div className={styles.stage} aria-hidden>
      <Canvas
        frameloop="never"
        dpr={dpr}
        gl={{ antialias: false, alpha: false, stencil: false, depth: false, powerPreference: "high-performance" }}
        camera={{ fov: 32, near: 0.1, far: 120, position: [0, 0, 14] }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            ui.set({ webgl: "unsupported" });
          });
        }}
      >
        <Driver />
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => {
            setTier((t) => Math.max(0, t - 1));
            setDpr((d) => Math.max(1, d - 0.25));
          }}
          onIncline={() => setTier((t) => Math.min(TIERS.length - 1, t + 1))}
          onFallback={() => {
            setTier(0);
            setDpr(1);
          }}
        />
        <PixelField count={TIERS[tier]} />
      </Canvas>
    </div>
  );
}
