"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TransitionLink } from "@/components/transition/navigation";
import { ui, useStore } from "@/lib/store";
import styles from "./AuditButton.module.css";

/** How long after scrolling stops the offer comes back, ms. */
const RETURN_MS = 900;
/** Room kept around the pill when checking what it would cover, px. */
const PAD = 12;

/**
 * Whether the pill would cover something it must not: any element tagged
 * `data-avoid` that enters the pill's own box, or a set piece tagged
 * `data-avoid-pill` that fills the middle of the screen. Intersection observers do
 * the watching, so nothing reads layout while you scroll.
 */
const useBlocked = (pathname: string) => {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const pill = document.querySelector<HTMLElement>("[data-audit-pill]");
    if (!pill) return;
    const hits = new Set<Element>();
    const pieces = new Set<Element>();
    let near: IntersectionObserver | null = null;
    let wide: IntersectionObserver | null = null;
    let timer = 0;
    const sync = () => setBlocked(hits.size > 0 || pieces.size > 0);
    const watch = () => {
      near?.disconnect();
      wide?.disconnect();
      hits.clear();
      pieces.clear();
      const cs = getComputedStyle(pill);
      const right = parseFloat(cs.right) || 0;
      const bottom = parseFloat(cs.bottom) || 0;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const px = (v: number) => `-${Math.max(0, Math.round(v))}px`;
      // the viewport shrunk to the pill's box: anything intersecting it is under the pill
      const box = [H - bottom - pill.offsetHeight - PAD, right - PAD, bottom - PAD, W - right - pill.offsetWidth - PAD].map(px).join(" ");
      near = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => (e.isIntersecting ? hits.add(e.target) : hits.delete(e.target)));
          sync();
        },
        { rootMargin: box },
      );
      wide = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => (e.isIntersecting ? pieces.add(e.target) : pieces.delete(e.target)));
          sync();
        },
        { rootMargin: "-46% 0px -46% 0px" },
      );
      document.querySelectorAll("[data-avoid]").forEach((n) => near?.observe(n));
      document.querySelectorAll("[data-avoid-pill]").forEach((n) => wide?.observe(n));
      sync();
    };
    const later = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(watch, 400);
    };
    watch();
    // set pieces mount lazily; look again when the page's tree changes
    const mo = new MutationObserver(later);
    const main = document.querySelector("main") ?? document.body;
    mo.observe(main, { childList: true, subtree: true });
    window.addEventListener("resize", later);
    return () => {
      near?.disconnect();
      wide?.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", later);
      window.clearTimeout(timer);
    };
  }, [pathname]);
  return blocked;
};

/**
 * The one standing offer, a reach away without covering what you are reading: it
 * slides away while you scroll down and comes back when you scroll up or stop.
 * Hidden where it would point at itself.
 */
export function AuditButton() {
  const pathname = usePathname();
  const menuOpen = useStore(ui, (s) => s.menuOpen);
  const done = useStore(ui, (s) => s.preloaderDone);
  const [away, setAway] = useState(false);
  const blocked = useBlocked(pathname);

  useEffect(() => {
    let lastY = window.scrollY;
    let timer = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (dy > 2 && y > 200) setAway(true);
      else if (dy < -2) setAway(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setAway(false), RETURN_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, []);

  if (pathname.startsWith("/contact")) return null;
  return (
    <TransitionLink
      href="/contact?intent=audit"
      className={styles.audit}
      data-hidden={menuOpen || !done || away || blocked ? "1" : undefined}
      data-audit-pill
      data-magnetic
      data-cursor="open"
    >
      <span className={styles.dot} aria-hidden />
      <span className={styles.text}>Book a store audit</span>
      <span className={`${styles.tag} t-hud`}>20 min</span>
    </TransitionLink>
  );
}
