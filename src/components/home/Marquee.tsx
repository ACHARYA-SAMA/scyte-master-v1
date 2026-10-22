"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/motion";
import styles from "./Marquee.module.css";

const PHRASES = ["Zero compromise", "Meticulously crafted", "High performance"];

/**
 * The base site's marquee, kept and given a pulse: it runs on its own, speeds up and
 * shears with scroll velocity, and reverses with the scroll direction.
 */
export function Marquee() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || prefersReducedMotion()) return;
      const track = el.querySelector<HTMLElement>("[data-track]");
      if (!track) return;
      const loop = gsap.to(track, { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
      const skew = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3.out" });
      let dir = 1;
      let straighten = 0;
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          const v = self.getVelocity();
          dir = self.direction;
          loop.timeScale(dir * (1 + Math.min(6, Math.abs(v) / 400)));
          skew(gsap.utils.clamp(-14, 14, -v / 220));
          window.clearTimeout(straighten);
          straighten = window.setTimeout(() => skew(0), 120);
        },
      });
      // Ease back to cruising speed after a flick.
      const settle = () => {
        const ts = loop.timeScale();
        loop.timeScale(ts + (dir - ts) * 0.04);
      };
      gsap.ticker.add(settle);
      return () => {
        st.kill();
        window.clearTimeout(straighten);
        gsap.ticker.remove(settle);
      };
    },
    { scope: root },
  );

  const run = (
    <>
      {PHRASES.map((p) => (
        <span key={p} className={styles.item}>
          {p}
        </span>
      ))}
    </>
  );

  return (
    <div ref={root} className={styles.marquee} aria-label={PHRASES.join(", ")} role="img">
      <div className={styles.track} data-track aria-hidden>
        {run}
        {run}
        {run}
        {run}
      </div>
    </div>
  );
}
