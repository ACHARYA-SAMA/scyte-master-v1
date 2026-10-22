"use client";

import { useRef } from "react";
import { PRODUCT_NAME } from "@/config/site";
import { StageWindow } from "@/components/stage/StageControls";
import { TransitionLink } from "@/components/transition/navigation";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/motion";
import styles from "./ProductHero.module.css";

const STEPS = [
  { text: "Fewer messages.", note: "0:40  engaged_time 38 s, size chart opened" },
  { text: "Better timed.", note: "3:05  payment_failed {reason: upi_timeout}" },
  { text: "Provably yours.", note: "day 30  messaged vs holdout, compared" },
];

export function ProductHero() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || prefersReducedMotion()) return;
      const tl = gsap.timeline({ delay: 0.15 });
      tl.from(el.querySelectorAll("[data-step-text]"), { yPercent: 110, duration: 0.9, ease: "latch", stagger: 0.12 });
      tl.from(el.querySelectorAll("[data-step-note]"), { opacity: 0, x: -12, duration: 0.4, ease: "glide", stagger: 0.12 }, "-=0.5");
      tl.from(el.querySelectorAll("[data-fade]"), { opacity: 0, y: 14, duration: 0.5, ease: "glide", stagger: 0.08 }, "-=0.3");
      gsap.to(el.querySelector("[data-stair]"), {
        yPercent: -18,
        opacity: 0.2,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });
    },
    { scope: root },
  );

  return (
    <StageWindow as="header" className={styles.hero}>
      <div ref={root} className={styles.inner}>
        <p className={styles.kicker} data-fade>
          {PRODUCT_NAME}, from Scyte
        </p>
        <h1 className={styles.stair} data-stair>
          {STEPS.map((s, i) => (
            <span key={s.text} className={styles.step} style={{ "--i": i } as React.CSSProperties}>
              <span className={styles.mask}>
                <span className={styles.stepText} data-step-text>
                  {s.text}
                </span>
              </span>
              <span className={styles.note} data-step-note aria-hidden>
                {s.note}
              </span>
            </span>
          ))}
        </h1>
        <div className={styles.foot}>
          <p className={styles.lede} data-fade>
            A behaviour-to-WhatsApp recovery platform for online brands, starting with Shopify stores in India. It
            watches how shoppers behave, works out who still wants to buy, and sends one consented message that
            recovers the abandoned cart, the failed payment or the risky COD order. Then it proves the revenue.
          </p>
          <div className={styles.actions} data-fade>
            <TransitionLink href="/contact#audit" className={styles.cta} data-magnetic="0.2">
              Book a 20-minute store audit
            </TransitionLink>
            <a href="#pipeline" className={styles.scroll}>
              Follow one shopper through it
            </a>
          </div>
        </div>
      </div>
    </StageWindow>
  );
}
