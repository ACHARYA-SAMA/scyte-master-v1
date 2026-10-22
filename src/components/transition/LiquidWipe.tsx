"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { registerCurtain } from "./curtainControl";
import styles from "./LiquidWipe.module.css";

const KHAKI = "#c2b897";
const LUMEN = "#f9dc7d";

/**
 * The route change: khaki liquid pours up from the bottom, its surface rippling out
 * from where you clicked, names the next chapter, then drains away onto the new page.
 * Drawn on a 2D canvas at device resolution, so the surface stays crisp.
 */
export function LiquidWipe() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = root.current;
    const c = canvas.current;
    if (!el || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    // level: 0 empty, 1 full. dir: +1 rising (cover), -1 draining (reveal)
    const s = { level: 0, energy: 0, origin: 0.5, t: 0, dir: 1 };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (s.level <= 0.0001) return;
      // draining keeps the liquid's surface at the top edge of the fill
      const surface = h * (1 - s.level);
      const amp = Math.min(48, h * 0.06) * s.energy;
      const ox = s.origin * w;
      const wave = (x: number) => {
        const d = Math.abs(x - ox) / w;
        const near = Math.exp(-d * 3.2);
        return (
          Math.sin(x * 0.011 - s.t * 7.5 + d * 9) * amp * (0.45 + 0.55 * near) +
          Math.sin(x * 0.027 + s.t * 5.1) * amp * 0.25
        );
      };
      ctx.beginPath();
      ctx.moveTo(0, h + 2);
      const step = Math.max(6, Math.round(w / 160));
      for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, surface + wave(x));
      ctx.lineTo(w, h + 2);
      ctx.closePath();
      ctx.fillStyle = KHAKI;
      ctx.fill();
      if (s.energy > 0.02 && s.level < 0.999) {
        ctx.beginPath();
        for (let x = 0; x <= w + step; x += step) {
          const y = surface + wave(x);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = LUMEN;
        ctx.lineWidth = 2;
        ctx.shadowColor = LUMEN;
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    const tick = () => {
      s.t += 1 / 60;
      draw();
    };

    registerCurtain({
      cover: ({ x }, text) =>
        new Promise<void>((resolve) => {
          if (label.current) label.current.textContent = text;
          el.dataset.active = "1";
          sfx.pour();
          s.origin = x / Math.max(1, w);
          if (prefersReducedMotion()) {
            s.level = 1;
            s.energy = 0;
            draw();
            gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none", onComplete: resolve });
            gsap.set(label.current, { opacity: 1, y: 0 });
            return;
          }
          gsap.set(el, { opacity: 1 });
          gsap.ticker.add(tick);
          const tl = gsap.timeline({ onComplete: resolve });
          tl.fromTo(s, { level: 0, energy: 1 }, { level: 1, duration: 0.72, ease: "pour" });
          tl.to(s, { energy: 0, duration: 0.5, ease: "drift" }, 0.3);
          tl.fromTo(label.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45, ease: "glide" }, 0.42);
        }),
      reveal: () =>
        new Promise<void>((resolve) => {
          const done = () => {
            gsap.ticker.remove(tick);
            el.dataset.active = "0";
            s.level = 0;
            draw();
            resolve();
          };
          if (prefersReducedMotion()) {
            gsap.to(el, { opacity: 0, duration: 0.25, ease: "none", onComplete: done });
            return;
          }
          const tl = gsap.timeline({ onComplete: done });
          tl.to(label.current, { opacity: 0, y: -18, duration: 0.25, ease: "cut" });
          tl.to(s, { energy: 0.7, duration: 0.2, ease: "none" }, 0.05);
          tl.to(s, { level: 0, duration: 0.7, ease: "pour" }, 0.1);
          tl.to(s, { energy: 0, duration: 0.4, ease: "drift" }, 0.45);
        }),
    });

    return () => {
      registerCurtain(null);
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div ref={root} className={styles.wipe} data-active="0" aria-hidden>
      <canvas ref={canvas} className={styles.canvas} />
      <p ref={label} className={styles.label} />
    </div>
  );
}
