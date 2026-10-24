"use client";

import type { CSSProperties } from "react";
import { TransitionLink } from "@/components/transition/navigation";
import { OPEN_SLOTS } from "@/data/work";
import styles from "./BlueprintSlots.module.css";

/** Each slot's wireframe, drawn line by line: a storefront, an app, a feed. */
const ART: Record<string, React.ReactNode> = {
  website: (
    <>
      <rect x="10" y="10" width="300" height="200" rx="6" />
      <line x1="10" y1="34" x2="310" y2="34" />
      <rect x="24" y="52" width="130" height="70" />
      <line x1="170" y1="60" x2="290" y2="60" />
      <line x1="170" y1="76" x2="270" y2="76" />
      <rect x="170" y="94" width="60" height="18" />
      <rect x="24" y="136" width="84" height="60" />
      <rect x="118" y="136" width="84" height="60" />
      <rect x="212" y="136" width="84" height="60" />
    </>
  ),
  apps: (
    <>
      <rect x="110" y="6" width="100" height="208" rx="16" />
      <line x1="140" y1="16" x2="180" y2="16" />
      <rect x="122" y="32" width="76" height="52" rx="4" />
      <line x1="122" y1="96" x2="198" y2="96" />
      <line x1="122" y1="108" x2="176" y2="108" />
      <rect x="122" y="122" width="34" height="34" rx="4" />
      <rect x="164" y="122" width="34" height="34" rx="4" />
      <line x1="122" y1="194" x2="198" y2="194" />
      <circle cx="160" cy="194" r="6" />
    </>
  ),
  social: (
    <>
      <rect x="30" y="8" width="120" height="150" rx="4" />
      <rect x="170" y="8" width="120" height="150" rx="4" />
      <circle cx="46" cy="24" r="7" />
      <circle cx="186" cy="24" r="7" />
      <rect x="40" y="40" width="100" height="80" />
      <rect x="180" y="40" width="100" height="80" />
      <line x1="40" y1="134" x2="120" y2="134" />
      <line x1="180" y1="134" x2="260" y2="134" />
      <rect x="30" y="172" width="260" height="38" rx="4" />
    </>
  ),
};

/**
 * W2, the reserved slots: three cases not yet made, as blueprints that draw
 * themselves and keep redrawing, each with a way to claim it. Nothing is a mock
 * client: the slot says plainly that it is open.
 */
export function BlueprintSlots() {
  return (
    <section id="open" className={styles.section} aria-labelledby="open-title">
      <header className={styles.head}>
        <p className={`${styles.kicker} t-hud`}>Case 01, 02 and 03</p>
        <h2 id="open-title" className={styles.title}>
          Reserved. Not yet made.
        </h2>
        <p className={styles.lede}>We take on a few projects at a time. Tell us what you sell and where it leaks, and we will say plainly whether we can help.</p>
      </header>
      <ul className={styles.slots}>
        {OPEN_SLOTS.map((o, i) => (
          <li key={o.id} className={styles.slot} style={{ "--i": i } as CSSProperties}>
            <div className={styles.paper} aria-hidden>
              <span className={styles.grid} />
              <svg viewBox="0 0 320 220" className={styles.wire}>
                {ART[o.id]}
              </svg>
              <span className={styles.scan} />
              <span className={`${styles.stamp} t-hud`}>Reserved</span>
              <span className={`${styles.sheetNo} t-hud`}>Case {String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className={styles.meta}>
              <p className={styles.name}>{o.title}</p>
              <p className={styles.what}>{o.what}</p>
              <TransitionLink href={o.href} className={`${styles.claim} cta`} data-magnetic data-cursor="open">
                Claim this slot
              </TransitionLink>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
