"use client";

import { useState, type CSSProperties } from "react";
import { TEAM, displayName } from "@/data/team";
import { ThrowableCards } from "@/components/kit/ThrowableCards";
import { TransitionLink } from "@/components/transition/navigation";
import styles from "./TeamSections.module.css";

/** Where each seat sits in the constellation, in a 1000 x 560 field. */
const AT: Record<string, [number, number]> = {
  "technical-lead": [500, 150],
  "full-stack": [790, 300],
  "product-sales": [500, 440],
  "design-copy": [210, 300],
};

/** How work moves between the seats, as each seat's role describes it. */
const HANDOFFS: { from: string; to: string; what: string }[] = [
  { from: "design-copy", to: "technical-lead", what: "templates go out through the WhatsApp integration" },
  { from: "technical-lead", to: "full-stack", what: "the event pipeline feeds the dashboard" },
  { from: "product-sales", to: "full-stack", what: "onboarding installs the Shopify app" },
  { from: "product-sales", to: "design-copy", what: "store calls shape the template copy" },
];

/** T4, the constellation: the four seats, their skills in orbit, and the hand-offs between them. */
function Constellation() {
  const [hot, setHot] = useState<string | null>(null);
  const curve = (a: [number, number], b: [number, number]) => {
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const k = 0.18;
    return `M${a[0]} ${a[1]} Q${mx + (b[1] - a[1]) * k} ${my - (b[0] - a[0]) * k} ${b[0]} ${b[1]}`;
  };
  return (
    <section className={styles.block} aria-labelledby="constellation-title">
      <header className={styles.head}>
        <p className={`${styles.kicker} t-hud`}>Constellation</p>
        <h2 id="constellation-title" className={styles.h2}>
          Four seats, and the work that passes between them.
        </h2>
        <p className={styles.lede}>Each seat&rsquo;s skills orbit it. The lit paths are the hand-offs its role describes. Point at a seat.</p>
      </header>
      <div className={styles.sky} data-motion-own>
        <svg viewBox="0 0 1000 560" className={styles.svg} role="img" aria-label="The four seats and the hand-offs between them">
          {HANDOFFS.map((h) => {
            const on = !hot || hot === h.from || hot === h.to;
            return (
              <g key={`${h.from}-${h.to}`} className={styles.edge} data-on={on ? "1" : "0"}>
                <path d={curve(AT[h.from]!, AT[h.to]!)} className={styles.edgeLine} />
                <path d={curve(AT[h.from]!, AT[h.to]!)} className={styles.edgeFlow} pathLength={1} />
              </g>
            );
          })}
          {TEAM.map((m, i) => {
            const [x, y] = AT[m.slug] ?? [500, 280];
            const dim = hot && hot !== m.slug && !HANDOFFS.some((h) => (h.from === hot && h.to === m.slug) || (h.to === hot && h.from === m.slug));
            return (
              <g
                key={m.slug}
                className={styles.star}
                data-dim={dim ? "1" : undefined}
                data-hot={hot === m.slug ? "1" : undefined}
                transform={`translate(${x} ${y})`}
                tabIndex={0}
                role="button"
                aria-label={`${displayName(m)}: ${m.role}`}
                onPointerEnter={() => setHot(m.slug)}
                onPointerLeave={() => setHot(null)}
                onFocus={() => setHot(m.slug)}
                onBlur={() => setHot(null)}
              >
                <g className={styles.orbit} style={{ "--d": `${38 + i * 6}s` } as CSSProperties}>
                  {m.skills.map((s, k) => {
                    const a = (k / m.skills.length) * Math.PI * 2;
                    const r = 74;
                    return (
                      <g key={s.label} transform={`translate(${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)})`}>
                        <circle r={3} className={styles.moon} />
                        <text y={-8} textAnchor="middle" className={styles.moonLabel}>
                          {s.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
                <circle r={74} className={styles.ring} />
                <circle r={13} className={styles.core} />
                <text y={38} textAnchor="middle" className={styles.starLabel}>
                  {displayName(m)}
                </text>
              </g>
            );
          })}
        </svg>
        <ul className={styles.legend} aria-live="polite">
          {HANDOFFS.filter((h) => !hot || hot === h.from || hot === h.to).map((h) => (
            <li key={`${h.from}-${h.to}`}>
              <b>{displayName(TEAM.find((m) => m.slug === h.from)!)}</b> to <b>{displayName(TEAM.find((m) => m.slug === h.to)!)}</b>: {h.what}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const RULES = [
  { id: "holdout", title: "A holdout from day one.", body: "Every pilot is measured against shoppers who hear nothing from us." },
  { id: "consent", title: "Consent before contact.", body: "No message goes to anyone who did not opt in, and STOP always works." },
  { id: "quiet", title: "Two messages, then quiet.", body: "Frequency caps and quiet hours are set before the first send." },
  { id: "lift", title: "If there is no lift, we say so.", body: "The week-four review reports the gap, whatever it turns out to be." },
  { id: "phone", title: "Fast on a budget phone.", body: "We test on a mid-range Android over mobile data, not only on our laptops." },
  { id: "trackers", title: "Nothing follows you home.", body: "This site sets no cookies and runs no tracking scripts. What it remembers stays in your browser." },
];

/**
 * T6 and T7: the rules of the room as cards you can throw around a table, and the
 * open seat: a hologram with nobody in it yet.
 */
export function TeamSections() {
  return (
    <>
      <Constellation />
      <section className={styles.block} aria-labelledby="rules-title">
        <header className={styles.head}>
          <p className={`${styles.kicker} t-hud`}>Rules of the room</p>
          <h2 id="rules-title" className={styles.h2}>
            How we work, on cards. Pick one up.
          </h2>
          <p className={styles.lede}>Throw them, stack them, slide them with the arrow keys. They are the same rules on every project.</p>
        </header>
        <ThrowableCards label="Rules of the room" cards={RULES} />
      </section>
      <section className={`${styles.block} ${styles.seat}`} aria-labelledby="seat-title">
        <div className={styles.hologram} aria-hidden>
          <span className={styles.figure} />
          <span className={styles.scanline} />
          <span className={styles.plinth} />
        </div>
        <div className={styles.seatCopy}>
          <p className={`${styles.kicker} t-hud`}>Seat five</p>
          <h2 id="seat-title" className={styles.h2}>
            This seat is empty.
          </h2>
          <p className={styles.lede}>
            There is no opening listed today. If you build things like the ones on this site and want to build them with us, say hello anyway.
          </p>
          <TransitionLink href="/contact" className={`${styles.hello} cta`} data-magnetic data-cursor="open">
            Say hello
          </TransitionLink>
        </div>
      </section>
    </>
  );
}
