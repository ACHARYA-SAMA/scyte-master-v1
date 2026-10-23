"use client";

import { useEffect, useRef, type ElementType } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger, springStep } from "@/lib/motion";
import styles from "./LiquidFillText.module.css";

type Props = {
  text: string;
  as?: ElementType;
  className?: string;
  /** scroll window over which it fills (ScrollTrigger start and end) */
  start?: string;
  end?: string;
};

const LEVEL = { stiffness: 60, damping: 11, mass: 1 };
const SLOSH = { stiffness: 40, damping: 5, mass: 1 };
const POINTS = 18;

/**
 * Giant type that fills with Lumen as it scrolls through the viewport. The empty part
 * is an outline, like a glass; the liquid has a moving meniscus with a bright crest,
 * and it sloshes the way the scroll throws it: scroll down fast and it tilts back,
 * stop and it rocks to rest. One clip-path per layer per frame, only while on screen.
 */
export function LiquidFillText({ text, as: Tag = "p", className, start = "top 85%", end = "bottom 40%" }: Props) {
  const root = useRef<HTMLElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const crest = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const f = fill.current;
    const c = crest.current;
    if (!el || !f || !c) return;
    if (prefersReducedMotion()) {
      f.style.clipPath = "none";
      c.style.display = "none";
      return;
    }
    const s = { level: 0, lv: 0, target: 0, tilt: 0, tv: 0, push: 0, phase: 0 };
    const st = ScrollTrigger.create({
      trigger: el,
      start,
      end,
      onUpdate: (self) => {
        s.target = self.progress;
        s.push = Math.max(-1, Math.min(1, self.getVelocity() / 2400));
      },
    });

    const draw = () => {
      const amp = 2.2 + Math.abs(s.tilt) * 6 + Math.abs(s.lv) * 4;
      const surface: string[] = [];
      const under: string[] = [];
      for (let k = 0; k <= POINTS; k++) {
        const x = k / POINTS;
        const y = (1 - s.level) * 100 + amp * Math.sin(Math.PI * 2 * x * 1.4 + s.phase) + s.tilt * 22 * (x - 0.5);
        const yc = Math.min(102, Math.max(-2, y));
        surface.push(`${(x * 100).toFixed(1)}% ${yc.toFixed(2)}%`);
        under.unshift(`${(x * 100).toFixed(1)}% ${(yc + 3.5).toFixed(2)}%`);
      }
      f.style.clipPath = `polygon(${surface.join(",")}, 100% 102%, 0% 102%)`;
      c.style.clipPath = `polygon(${surface.join(",")}, ${under.join(",")})`;
      c.style.opacity = s.level > 0.01 && s.level < 0.995 ? "1" : "0";
    };

    const tick = (_t: number, deltaMs: number) => {
      const dt = Math.min(0.05, deltaMs / 1000);
      // plain assignments: the minifier mis-folds objects written only by destructuring
      const lv = springStep(s.level, s.lv, s.target, LEVEL, dt);
      s.level = lv[0];
      s.lv = lv[1];
      // the scroll's push tips the surface; the spring rocks it back
      const tv = springStep(s.tilt, s.tv, -s.push, SLOSH, dt);
      s.tilt = tv[0];
      s.tv = tv[1];
      s.push *= Math.exp(-dt * 5);
      s.phase += dt * (1.6 + Math.abs(s.tv) * 3);
      draw();
    };

    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    });
    io.observe(el);
    draw();
    return () => {
      st.kill();
      io.disconnect();
      gsap.ticker.remove(tick);
    };
  }, [start, end]);

  return (
    <Tag ref={root} className={`${styles.liquid} ${className ?? ""}`} data-motion-own>
      <span className={styles.glass}>{text}</span>
      <span ref={fill} className={styles.fill} aria-hidden>
        {text}
      </span>
      <span ref={crest} className={styles.crest} aria-hidden>
        {text}
      </span>
    </Tag>
  );
}
