"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { ui, useStore } from "@/lib/store";

/**
 * Depth while scrolling: every [data-parallax="speed"] element in <main> slides by
 * speed x its own height as it crosses the screen (negative moves against the scroll).
 * ScrollTrigger caches positions, so nothing reads layout per frame. Images inside a
 * frame get data-parallax on the <img> and are scaled up a little in CSS, so the
 * frame never shows an edge.
 */
export function Parallax() {
  const pathname = usePathname();
  const ready = useStore(ui, (s) => s.preloaderDone);
  useEffect(() => {
    if (!ready || prefersReducedMotion()) return;
    const main = document.getElementById("main");
    if (!main) return;
    let ctx: gsap.Context | null = null;
    const raf = requestAnimationFrame(() => {
      ctx = gsap.context(() => {
        main.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
          const speed = Number(el.dataset.parallax) || 0.2;
          gsap.fromTo(
            el,
            { yPercent: -speed * 50 },
            { yPercent: speed * 50, ease: "none", scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true } },
          );
        });
      }, main);
    });
    return () => {
      cancelAnimationFrame(raf);
      ctx?.revert();
    };
  }, [pathname, ready]);
  return null;
}
