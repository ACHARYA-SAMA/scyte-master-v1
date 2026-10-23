"use client";

import { useEffect, useId, useRef } from "react";
import { Logo } from "@/components/brand/Logo";
import { gsap, prefersReducedMotion, springStep, SPRING } from "@/lib/motion";
import styles from "./HeroLogo.module.css";

/**
 * The exact wordmark, with a glass lens that rides the pointer. Inside the lens the
 * letters refract (a magnified, liquid-displaced copy in the lit colour); outside it
 * the logo is untouched. With no pointer on it, the lens is gone and the mark is exact.
 */
export function HeroLogo() {
  const fid = useId().replace(/:/g, "");
  const root = useRef<HTMLDivElement>(null);
  const turb = useRef<SVGFETurbulenceElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const s = { x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, tx: 0, ty: 0, tr: 0 };
    let inside = false;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      s.tx = e.clientX - r.left;
      s.ty = e.clientY - r.top;
      const pad = 40;
      inside = s.tx > -pad && s.ty > -pad && s.tx < r.width + pad && s.ty < r.height + pad;
      s.tr = inside ? Math.min(150, Math.max(90, r.height * 0.62)) : 0;
      if (s.r < 1 && inside) {
        s.x = s.tx;
        s.y = s.ty;
      }
    };
    let t = 0;
    let written = false;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      t += dt;
      [s.x, s.vx] = springStep(s.x, s.vx, s.tx, SPRING.magnet, dt);
      [s.y, s.vy] = springStep(s.y, s.vy, s.ty, SPRING.magnet, dt);
      [s.r, s.vr] = springStep(s.r, s.vr, s.tr, SPRING.snap, dt);
      // with the lens closed and still, writing the same values every frame would still
      // invalidate the logo's style and repaint its mask: skip until something moves
      const still = s.r < 0.5 && s.tr === 0 && Math.abs(s.vr) < 0.01;
      if (still && written) return;
      written = still;
      el.style.setProperty("--lx", `${s.x.toFixed(1)}px`);
      el.style.setProperty("--ly", `${s.y.toFixed(1)}px`);
      el.style.setProperty("--lr", `${Math.max(0, s.r).toFixed(1)}px`);
      el.style.setProperty("--lo", Math.min(1, Math.max(0, s.r) / 40).toFixed(3));
      if (turb.current && s.r > 1) {
        const f = 0.011 + Math.sin(t * 0.9) * 0.0025;
        turb.current.setAttribute("baseFrequency", `${f.toFixed(4)} ${(f * 1.6).toFixed(4)}`);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div ref={root} className={styles.hero} data-hero-logo>
      <svg className={styles.defs} aria-hidden width="0" height="0">
        <filter id={fid} x="-10%" y="-30%" width="120%" height="160%">
          <feTurbulence ref={turb} type="fractalNoise" baseFrequency="0.011 0.018" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <Logo className={styles.base} title="Scyte" />
      {/* light running through the letters until the glass scene takes over */}
      <span className={styles.flow} aria-hidden>
        <span />
      </span>
      <div className={styles.lens} aria-hidden>
        <div className={styles.lensInner} style={{ filter: `url(#${fid})` }}>
          <Logo className={styles.lit} title={null} />
        </div>
      </div>
      <span className={styles.rim} aria-hidden />
    </div>
  );
}
