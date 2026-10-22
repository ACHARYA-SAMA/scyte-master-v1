"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger } from "@/lib/motion";
import { SliceWord, STRIPS, setSliced, type Face, type StripHandle, type Tone } from "./SliceWord";

type Props = {
  className?: string;
  style?: CSSProperties;
  tone?: Tone;
  face?: Face;
  /** Assemble strip by strip when scrolled into view. */
  assembleOnEnter?: boolean;
  /** Strength of the pointer slice, in % of the logo height. */
  strength?: number;
  dataHeroLogo?: boolean;
};

const LOGO: Face = { id: "logo", kind: "logo" };

/**
 * The exact wordmark, cut into its 28 grid strips only while something moves it.
 * The pointer pushes strips near it up and down (velocity-scaled), then everything
 * settles back to the single unsliced drawing.
 */
export function ReactiveLogo({
  className,
  style,
  tone = "bone",
  face = LOGO,
  assembleOnEnter = false,
  strength = 14,
  dataHeroLogo = false,
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  const handle = useRef<StripHandle | null>(null);
  const setters = useRef<((v: number) => void)[]>([]);
  const offsets = useRef<number[]>(new Array(STRIPS).fill(0));
  const restTimer = useRef(0);

  const onStrips = useCallback((h: StripHandle) => {
    handle.current = h;
    setters.current = h.strips.map((s, i) =>
      gsap.quickTo(s, "yPercent", {
        duration: 0.55,
        ease: "power3.out",
        onUpdate: () => {
          offsets.current[i] = Number(gsap.getProperty(s, "yPercent")) || 0;
        },
      }),
    );
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || prefersReducedMotion()) return;
    let lastX = 0;
    let lastT = performance.now();
    let release = 0;

    const settle = () => {
      window.clearTimeout(restTimer.current);
      restTimer.current = window.setTimeout(() => {
        const moving = offsets.current.some((o) => Math.abs(o) > 0.05);
        if (!moving && handle.current) setSliced(handle.current.layer, false);
        else settle();
      }, 260);
    };

    const onMove = (e: PointerEvent) => {
      const h = handle.current;
      if (!h || h.layer.dataset.state === "out") return;
      const r = el.getBoundingClientRect();
      const now = performance.now();
      const v = Math.min(3, Math.abs(e.clientX - lastX) / Math.max(1, now - lastT));
      lastX = e.clientX;
      lastT = now;
      const within = e.clientY > r.top - r.height * 0.6 && e.clientY < r.bottom + r.height * 0.6;
      if (!within) return;
      setSliced(h.layer, true);
      const u = ((e.clientX - r.left) / r.width) * STRIPS;
      const vy = (e.clientY - (r.top + r.height / 2)) / r.height;
      setters.current.forEach((set, i) => {
        const d = i + 0.5 - u;
        const fall = Math.exp(-(d * d) / 6);
        set(fall * (0.35 + v) * strength * (i % 2 ? -1 : 1) * (0.6 + Math.abs(vy)));
      });
      // spring back once the pointer stops pushing
      window.clearTimeout(release);
      release = window.setTimeout(() => setters.current.forEach((set) => set(0)), 90);
      settle();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.clearTimeout(restTimer.current);
      window.clearTimeout(release);
    };
  }, [strength]);

  useEffect(() => {
    if (!assembleOnEnter || prefersReducedMotion()) return;
    const el = box.current;
    const h = handle.current;
    if (!el || !h) return;
    setSliced(h.layer, true);
    gsap.set(h.strips, { yPercent: (i: number) => 110 + ((i * 29) % 7) * 12 });
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 92%",
      once: true,
      onEnter: () =>
        gsap.to(h.strips, {
          yPercent: 0,
          duration: 0.9,
          ease: "latch",
          stagger: { each: 0.022, from: "random" },
          onComplete: () => setSliced(h.layer, false),
        }),
    });
    return () => st.kill();
  }, [assembleOnEnter]);

  return (
    <div ref={box} className={className} style={style} data-hero-logo={dataHeroLogo ? "" : undefined}>
      <SliceWord face={face} tone={tone} onStrips={onStrips} />
    </div>
  );
}
