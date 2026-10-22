"use client";

import { usePathname } from "next/navigation";
import { TransitionLink } from "@/components/transition/navigation";
import { ui, useStore } from "@/lib/store";
import styles from "./AuditButton.module.css";

/** The one standing offer, always a reach away. Hidden where it would point at itself. */
export function AuditButton() {
  const pathname = usePathname();
  const menuOpen = useStore(ui, (s) => s.menuOpen);
  const done = useStore(ui, (s) => s.preloaderDone);
  if (pathname.startsWith("/contact")) return null;
  return (
    <TransitionLink
      href="/contact?intent=audit"
      className={styles.audit}
      data-hidden={menuOpen || !done ? "1" : undefined}
      data-magnetic
      data-cursor="open"
    >
      <span className={styles.dot} aria-hidden />
      <span className={styles.text}>Book a store audit</span>
      <span className={`${styles.tag} t-hud`}>20 min</span>
    </TransitionLink>
  );
}
