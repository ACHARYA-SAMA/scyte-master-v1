"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion, registerMotion } from "@/lib/motion";

/** The single Lenis instance. Read it, never construct another. */
export const scroller: { lenis: Lenis | null } = { lenis: null };

/** Glide the page to a y, through Lenis when it runs; native scrolling otherwise. */
export const scrollToY = (y: number, duration = 1.1) => {
  if (scroller.lenis) scroller.lenis.scrollTo(y, { duration, force: true });
  else window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });
};

export const scrollToTop = () => {
  if (scroller.lenis) scroller.lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
};

/**
 * Smooth scroll on one clock: GSAP's ticker drives Lenis (and the WebGL stage), and
 * Lenis feeds ScrollTrigger. Reduced motion keeps native scrolling.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  // triggers measure positions once; lazy sections, fonts and images change them after.
  // When the page's height settles somewhere new, measure everything again, once
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;
    let timer = 0;
    let last = main.offsetHeight;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const h = main.offsetHeight;
        if (Math.abs(h - last) < 2) return;
        last = h;
        scroller.lenis?.resize();
        ScrollTrigger.refresh();
      }, 220);
    });
    ro.observe(main);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    registerMotion();
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.1,
      wheelMultiplier: 0.95,
      smoothWheel: true,
      syncTouch: false,
      anchors: true,
    });
    scroller.lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      scroller.lenis = null;
    };
  }, []);

  return <>{children}</>;
}
