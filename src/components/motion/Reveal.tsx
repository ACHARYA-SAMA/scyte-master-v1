"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap, prefersReducedMotion, SplitText } from "@/lib/motion";
import { ui, useStore } from "@/lib/store";

/**
 * How every page arrives, so no screen sits still waiting for input. Run on each route,
 * over <main>, skipping anything inside [data-motion-own] (scenes, phones, devices and
 * the home story choreograph themselves):
 *
 *   headings   rise line by line out of a mask
 *   HUD labels decode, like an instrument coming up
 *   copy       wipes in from the top as it rises, a few blocks at a time (never
 *              faded: text is at full contrast whenever any of it is visible)
 *   images     pour in from the bottom, the way the menu's light does
 *
 * Without JavaScript nothing is hidden. Targets are read in one pass and hidden in one
 * write, then a single IntersectionObserver plays them as they arrive: no scroll
 * listeners, no layout reads while scrolling, and a heading is only split into lines
 * when it is about to rise. What is on screen at load waits for the route curtain or
 * the preloader to clear, then plays as one sequence.
 */

type Kind = "heading" | "hud" | "image" | "block";

const SKIP = "[data-motion-own], [aria-hidden='true'], .sr-only, [inert]";
const HUD_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
/** the longest a batch of arrivals cascades, in seconds */
const MAX_CASCADE = 1.1;

const usable = (el: Element) => !el.closest(SKIP) && (el as HTMLElement).offsetParent !== null;

const inDocumentOrder = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

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

/** Every target on the page and what it does when it arrives. Reads only. */
const pick = (main: HTMLElement) => {
  const kinds = new Map<Element, Set<Kind>>();
  const add = (el: Element, k: Kind) => {
    const set = kinds.get(el) ?? new Set<Kind>();
    set.add(k);
    kinds.set(el, set);
  };
  const fold = window.innerHeight;

  main.querySelectorAll("h1, h2, h3").forEach((h) => {
    if (usable(h) && !h.querySelector("[data-l], svg, img")) add(h, "heading");
  });
  main.querySelectorAll<HTMLElement>(".t-hud").forEach((el) => {
    const text = el.textContent?.trim() ?? "";
    if (usable(el) && !el.children.length && text.length >= 2 && text.length <= 48) add(el, "hud");
  });
  main.querySelectorAll("figure, img").forEach((el) => {
    if (!usable(el) || (el.tagName === "IMG" && el.closest("figure")) || el.matches("[data-handoff]")) return;
    // a frame that just arrived on the shared-element hand-off is already in place
    if (el.querySelector("[data-handoff]") && el.getBoundingClientRect().top < fold) return;
    add(el, "image");
  });
  const blocks = new Set<Element>();
  main.querySelectorAll("p, li, dl, blockquote, form > *, [data-reveal]").forEach((el) => {
    if (!usable(el) || el.closest("h1, h2, h3, figure")) return;
    for (let a = el.parentElement; a && a !== main; a = a.parentElement) if (blocks.has(a)) return;
    blocks.add(el);
    add(el, "block");
  });
  return kinds;
};

export function Reveal() {
  const pathname = usePathname();
  const ready = useStore(ui, (s) => s.preloaderDone);

  useEffect(() => {
    if (!ready || prefersReducedMotion()) return;
    const main = document.getElementById("main");
    if (!main) return;
    let alive = true;
    let io: IntersectionObserver | null = null;
    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {}, main);

    const play = (arriving: Element[], kinds: Map<Element, Set<Kind>>) => {
      ctx.add(() => {
        const tl = gsap.timeline();
        let at = 0;
        const next = (step: number) => {
          const t = at;
          at = Math.min(MAX_CASCADE, at + step);
          return t;
        };
        for (const el of arriving) {
          const k = kinds.get(el);
          if (!k) continue;
          if (k.has("block")) {
            tl.to(el, { clipPath: "inset(0% 0% -12% 0%)", y: 0, duration: 0.85, ease: "glide", clearProps: "clipPath,transform" }, next(0.06));
          }
          if (k.has("image")) {
            tl.to(el, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 1.15, ease: "pour", clearProps: "clipPath,scale" }, next(0.08));
          }
          if (k.has("heading")) {
            gsap.set(el, { clearProps: "clipPath" });
            const split = SplitText.create(el, { type: "lines", mask: "lines" });
            splits.push(split);
            tl.fromTo(split.lines, { yPercent: 108 }, { yPercent: 0, duration: 1.05, ease: "snap", stagger: 0.085, onComplete: () => split.revert() }, next(0.12));
          }
          if (k.has("hud")) {
            const text = el.textContent?.trim() ?? "";
            tl.to(el, { duration: Math.min(1.1, 0.35 + text.length * 0.03), scrambleText: { text, chars: HUD_CHARS, speed: 0.6, revealDelay: 0.15 }, ease: "none" }, next(0.02));
          }
        }
      });
    };

    const setup = async () => {
      await document.fonts.ready;
      if (!alive) return;
      const kinds = pick(main);
      const of = (k: Kind) => [...kinds].filter(([, s]) => s.has(k)).map(([el]) => el);
      // hide in one write, after every read
      ctx.add(() => {
        gsap.set(of("heading"), { clipPath: "inset(0% 0% 100% 0%)" });
        gsap.set(of("image"), { clipPath: "inset(100% 0% 0% 0%)", scale: 1.04, transformOrigin: "50% 100%" });
        gsap.set(of("block"), { clipPath: "inset(0% 0% 100% 0%)", y: 22 });
      });
      await whenIdle();
      if (!alive) return;
      io = new IntersectionObserver(
        (entries) => {
          const arriving = entries
            .filter((e) => e.isIntersecting)
            .map((e) => e.target)
            .sort(inDocumentOrder);
          if (!arriving.length) return;
          arriving.forEach((el) => io?.unobserve(el));
          play(arriving, kinds);
        },
        { rootMargin: "0px 0px -8% 0px" },
      );
      [...kinds.keys()].sort(inDocumentOrder).forEach((el) => io?.observe(el));
    };

    // let the new route lay out first
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => void setup()));
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io?.disconnect();
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, [pathname, ready]);

  return null;
}
