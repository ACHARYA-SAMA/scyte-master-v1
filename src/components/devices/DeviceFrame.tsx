"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion, springStep, SPRING } from "@/lib/motion";
import styles from "./DeviceFrame.module.css";

type Props = {
  kind: "laptop" | "tablet";
  children: ReactNode;
  label?: string;
  className?: string;
  /** lean towards the pointer, on springs */
  tilt?: boolean;
};

/**
 * Generic hardware for real DOM screens: a laptop or a tablet, brushed green-black,
 * no brand marks. The screen is ordinary, interactive HTML.
 */
export function DeviceFrame({ kind, children, label, className, tilt = true }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = wrap.current;
    const b = body.current;
    if (!w || !b || !tilt || prefersReducedMotion()) return;
    const s = { rx: 0, vx: 0, ry: 0, vy: 0, tx: 0, ty: 0 };
    const move = (e: PointerEvent) => {
      const r = w.getBoundingClientRect();
      if (e.clientY < r.top - 200 || e.clientY > r.bottom + 200) return;
      const nx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const ny = (e.clientY - (r.top + r.height / 2)) / r.height;
      s.ty = Math.max(-1, Math.min(1, nx)) * 5;
      s.tx = -Math.max(-1, Math.min(1, ny)) * 3.5;
    };
    const leave = () => {
      s.tx = 0;
      s.ty = 0;
    };
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      [s.rx, s.vx] = springStep(s.rx, s.vx, s.tx, SPRING.float, dt);
      [s.ry, s.vy] = springStep(s.ry, s.vy, s.ty, SPRING.float, dt);
      b.style.setProperty("--rx", `${s.rx.toFixed(2)}deg`);
      b.style.setProperty("--ry", `${s.ry.toFixed(2)}deg`);
    };
    window.addEventListener("pointermove", move, { passive: true });
    w.addEventListener("pointerleave", leave);
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("pointermove", move);
      w.removeEventListener("pointerleave", leave);
      gsap.ticker.remove(tick);
    };
  }, [tilt]);

  return (
    <div ref={wrap} className={`${styles.wrap} ${className ?? ""}`} data-kind={kind} role="group" aria-label={label} data-motion-own data-avoid>
      <div ref={body} className={styles.body}>
        <div className={styles.lid}>
          <span className={styles.camera} aria-hidden />
          <div className={styles.screen} data-lenis-prevent>
            {children}
          </div>
        </div>
        {kind === "laptop" ? <div className={styles.base} aria-hidden /> : null}
      </div>
    </div>
  );
}
