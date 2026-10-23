"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap, prefersReducedMotion, ScrollTrigger, SplitText } from "@/lib/motion";
import { ui, useStore } from "@/lib/store";

/**
 * How every page arrives, so no screen sits still waiting for input. Run on each route,
 * over <main>, skipping anything inside [data-motion-own] (scenes, phones, devices and
 * the home story choreograph themselves):
 *
 *   headings   rise line by line out of a mask
 *   HUD labels decode, like an instrument coming up
 *   copy       settles in, a few lines at a time, as it scrolls into view
 *   images     pour in from the bottom, the way the menu's light does
 *
 * Without JavaScript nothing is hidden. What is already on screen waits for the route
 * curtain or the preloader to clear, then plays as one sequence.
 */

const SKIP = "[data-motion-own], [aria-hidden='true'], .sr-only, [inert]";
const HUD_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const usable = (el: Element) => !el.closest(SKIP) && (el as HTMLElement).offsetParent !== null;

const whenIdle = () =>
  new Promise<void>((resolve) => {
    const ok = () => ui.get().transition === "idle" && ui.get().preloaderDone;
    if (ok()) return resolve();
    const stop = ui.subscribe(() => {
      if (!ok()) return;
      stop();
      resolve();
    });
  });

export function Reveal() {
  const pathname = usePathname();
  const ready = useStore(ui, (s) => s.preloaderDone);

  useEffect(() => {
    if (!ready || prefersReducedMotion()) return;
    const main = document.getElementById("main");
    if (!main) return;
    let alive = true;
    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {}, main);

    const setup = async () => {
      await document.fonts.ready;
      if (!alive) return;
      const fold = window.innerHeight * 0.92;
      const seen = (el: Element) => el.getBoundingClientRect().top < fold;
      let opening: gsap.core.Timeline | null = null;
      let openingAt = 0;
      const queue = (tween: (tl: gsap.core.Timeline, at: number) => void, weight: number) => {
        if (!opening) return;
        tween(opening, openingAt);
        openingAt += weight;
      };

      ctx.add(() => {
        opening = gsap.timeline({ paused: true });
        // headings: line by line out of a mask
        main.querySelectorAll<HTMLElement>("h1, h2, h3").forEach((h) => {
          if (!usable(h) || h.querySelector("[data-l], svg, img")) return;
          const split = SplitText.create(h, { type: "lines", mask: "lines", linesClass: "reveal-line" });
          splits.push(split);
          gsap.set(split.lines, { yPercent: 108 });
          const play = { yPercent: 0, duration: 1.05, ease: "snap", stagger: 0.085, onComplete: () => split.revert() };
          if (seen(h)) queue((tl, at) => tl.to(split.lines, play, at), 0.12);
          else gsap.to(split.lines, { ...play, scrollTrigger: { trigger: h, start: "top 88%", once: true } });
        });

        // HUD labels: decode
        main.querySelectorAll<HTMLElement>(".t-hud").forEach((el) => {
          const text = el.textContent?.trim() ?? "";
          if (!usable(el) || el.children.length || text.length < 2 || text.length > 48) return;
          const play = { duration: Math.min(1.1, 0.35 + text.length * 0.03), scrambleText: { text, chars: HUD_CHARS, speed: 0.6, revealDelay: 0.15 }, ease: "none" };
          if (seen(el)) queue((tl, at) => tl.to(el, play, at), 0.02);
          else gsap.to(el, { ...play, scrollTrigger: { trigger: el, start: "top 92%", once: true } });
        });

        // images: poured in from the bottom
        const images = Array.from(main.querySelectorAll<HTMLElement>("figure, img")).filter(
          (el) => usable(el) && !(el.tagName === "IMG" && el.closest("figure")),
        );
        const pour = { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 1.15, ease: "pour", clearProps: "clipPath,scale" };
        images.forEach((el) => {
          // a frame that just arrived on the shared-element hand-off is already in place
          if (seen(el) && el.querySelector("[data-handoff]")) return;
          if (el.matches("[data-handoff]")) return;
          gsap.set(el, { clipPath: "inset(100% 0% 0% 0%)", scale: 1.04, transformOrigin: "50% 100%" });
          if (seen(el)) queue((tl, at) => tl.to(el, pour, at), 0.08);
          else gsap.to(el, { ...pour, scrollTrigger: { trigger: el, start: "top 90%", once: true } });
        });

        // copy and blocks: a few at a time as they enter
        const picked = new Set<Element>();
        const blocks = Array.from(main.querySelectorAll<HTMLElement>("p, li, dl, blockquote, form > *, [data-reveal]")).filter((el) => {
          if (!usable(el) || el.closest("h1, h2, h3, figure") || picked.has(el)) return false;
          for (let a = el.parentElement; a && a !== main; a = a.parentElement) if (picked.has(a)) return false;
          picked.add(el);
          return true;
        });
        const above = blocks.filter(seen);
        const below = blocks.filter((el) => !seen(el));
        const settle = { autoAlpha: 1, y: 0, duration: 0.85, ease: "glide", stagger: 0.06, clearProps: "opacity,visibility,transform" };
        gsap.set(blocks, { autoAlpha: 0, y: 22 });
        if (above.length) queue((tl, at) => tl.to(above, settle, at), 0);
        ScrollTrigger.batch(below, {
          start: "top 92%",
          once: true,
          onEnter: (batch) => gsap.to(batch, settle),
        });
      });

      await whenIdle();
      if (alive) (opening as gsap.core.Timeline | null)?.play();
    };

    // let the new route lay out first
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => void setup()));
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, [pathname, ready]);

  return null;
}
