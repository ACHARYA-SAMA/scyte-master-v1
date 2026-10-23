"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TransitionLink } from "@/components/transition/navigation";
import { ui, useStore } from "@/lib/store";
import styles from "./AuditButton.module.css";

/** How long after scrolling stops the offer comes back, ms. */
const RETURN_MS = 900;

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
      data-hidden={menuOpen || !done || away ? "1" : undefined}
      data-magnetic
      data-cursor="open"
    >
      <span className={styles.dot} aria-hidden />
      <span className={styles.text}>Book a store audit</span>
      <span className={`${styles.tag} t-hud`}>20 min</span>
    </TransitionLink>
  );
}
