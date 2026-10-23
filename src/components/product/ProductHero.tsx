"use client";

import { useEffect, useRef } from "react";
import { PRODUCT_NAME } from "@/config/site";
import { scroller } from "@/components/providers/SmoothScroll";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { useRunningLight } from "@/lib/useRunningLight";
import styles from "./ProductHero.module.css";

export const STATIONS = [
  { id: "collect", n: "01", name: "Collect", line: "Every event, from the browser and the gateway" },
  { id: "identify", n: "02", name: "Identify", line: "A phone number, only with consent" },
  { id: "understand", n: "03", name: "Understand", line: "Intent as a score you can read" },
  { id: "decide", n: "04", name: "Decide", line: "Rules, caps, quiet hours, holdout" },
  { id: "send", n: "05", name: "Send", line: "Approved templates, official API" },
  { id: "measure", n: "06", name: "Measure", line: "Revenue against a holdout" },
];

/** The product page opens on the machine's name and its six stations, as a map. */
export function ProductHero() {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  // Aarav's path, run on a loop: each station lights in turn while the page waits
  useRunningLight(list, 1100);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-word]", { yPercent: 105 }, { yPercent: 0, duration: 1.1, ease: "snap", stagger: 0.08, delay: 0.15 });
      gsap.fromTo("[data-station]", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, ease: "glide", stagger: 0.06, delay: 0.5 });
      // the giant word drifts as the page starts to scroll, then hands over to station one
      gsap.to("[data-bleed]", { xPercent: -18, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true } });
    }, el);
    return () => ctx.revert();
  }, []);

  const jump = (id: string) => {
    const t = document.getElementById(id);
    if (!t) return;
    if (scroller.lenis) scroller.lenis.scrollTo(t, { offset: 2 });
    else t.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header ref={root} className={styles.hero} id="machine-top" data-motion-own>
      <p className={styles.bleed} aria-hidden data-bleed>
        THE MACHINE
      </p>
      <div className={styles.top}>
        <p className={`${styles.kicker} t-hud`}>
          <span className="fill">{PRODUCT_NAME}</span>
          <span>WhatsApp recovery for Indian online stores</span>
        </p>
        <h1 className={styles.title}>
          <span className={styles.mask}>
            <span data-word>Six stations</span>
          </span>
          <span className={styles.mask}>
            <span data-word>between a page view</span>
          </span>
          <span className={styles.mask}>
            <span data-word>and proof.</span>
          </span>
        </h1>
        <p className={styles.lede}>
          We watch how shoppers behave, work out who really intends to buy, and send consented, pre-approved WhatsApp messages that
          recover abandoned carts, failed payments and risky cash-on-delivery orders. Then we prove the money against a holdout. Follow
          Aarav through all six: the rail on the right is his 20 minutes, and you can drag it.
        </p>
      </div>
      <ol ref={list} className={styles.stations}>
        {STATIONS.map((s) => (
          <li key={s.id} data-station>
            <button type="button" className={styles.station} onClick={() => jump(s.id)} data-cursor="open" data-tilt>
              <span className={styles.n}>{s.n}</span>
              <span className={styles.sName}>{s.name}</span>
              <span className={`${styles.sLine} t-small`}>{s.line}</span>
            </button>
          </li>
        ))}
      </ol>
    </header>
  );
}
