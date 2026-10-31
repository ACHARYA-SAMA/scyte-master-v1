"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger } from "@/lib/motion";
import { scroller } from "@/components/providers/SmoothScroll";
import styles from "./Tapes.module.css";

const LEAKS = ["UPI_TIMEOUT", "BANK_DECLINE", "INSUFFICIENT_FUNDS", "USER_CANCELLED", "COD_UNCONFIRMED", "CART_ABANDONED"];
const FIXES = ["Retry in one tap", "Pay by UPI", "Cash on delivery", "Your cart is saved", "Confirm your order", "Back in stock"];

function Tape({ words, className, label }: { words: string[]; className: string; label: string }) {
  // two copies of the run, so the loop is seamless
  const run = [...words, ...words];
  return (
    <div className={`${styles.tape} ${className}`} data-tape aria-label={label} role="img">
      <div className={styles.track} data-track>
        {[0, 1].map((copy) => (
          <span key={copy} className={styles.run} aria-hidden>
            {run.map((word, i) => (
              <span key={`${copy}-${i}`} className={styles.word}>
                {word}
                <i className={styles.mark} />
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Two tapes thrown across the page as the film ends: every reason a payment fails on
 * one, the fix for it on the other. They run in opposite directions, swing in as the
 * band arrives, and run faster the harder the page is scrolled.
 */
export function Tapes() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const tapes = Array.from(el.querySelectorAll<HTMLElement>("[data-tape]"));
    const tracks = Array.from(el.querySelectorAll<HTMLElement>("[data-track]"));
    const reduced = prefersReducedMotion();
    const st = { p: 0, shift: [0, 0], push: 0, last: performance.now(), inView: false };
    const trigger = ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onUpdate: (self) => void (st.p = self.progress) });
    const seen = new IntersectionObserver(([e]) => void (st.inView = Boolean(e?.isIntersecting)));
    seen.observe(el);

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - st.last) / 1000);
      st.last = now;
      if (!st.inView) return;
      // swing in as the band comes up the screen, settle, and lean on through
      const enter = Math.min(1, st.p / 0.42);
      const swing = reduced ? 1 : 1 - Math.pow(1 - enter, 3) * Math.cos(enter * Math.PI * 1.5);
      const velocity = Math.abs(scroller.lenis?.velocity ?? 0);
      st.push += (Math.min(60, velocity) - st.push) * Math.min(1, dt * 5);
      tapes.forEach((tape, i) => {
        const lean = i ? 5.5 : -6.5;
        const angle = lean * swing + (st.p - 0.5) * (i ? -3 : 3);
        tape.style.transform = `translate3d(${(1 - swing) * (i ? 18 : -18)}vw, 0, 0) rotate(${angle.toFixed(2)}deg)`;
      });
      if (reduced) return;
      tracks.forEach((track, i) => {
        const speed = 60 + st.push * 9;
        st.shift[i] = (st.shift[i]! + dt * speed) % (track.scrollWidth / 2);
        const x = i ? -track.scrollWidth / 2 + st.shift[i]! : -st.shift[i]!;
        track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
      });
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      trigger.kill();
      seen.disconnect();
    };
  }, []);

  return (
    <section ref={root} className={styles.section} aria-label="Why payments fail, and the fix for each">
      <Tape words={LEAKS} className={styles.leaks} label={`Reasons a payment fails: ${LEAKS.join(", ")}`} />
      <Tape words={FIXES} className={styles.fixes} label={`The fixes: ${FIXES.join(", ")}`} />
    </section>
  );
}
