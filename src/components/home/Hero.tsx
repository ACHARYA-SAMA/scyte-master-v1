"use client";

import { useRef } from "react";
import { ReactiveLogo } from "@/components/brand/ReactiveLogo";
import { StageWindow } from "@/components/stage/StageControls";
import { TransitionLink } from "@/components/transition/navigation";
import { bridge } from "@/components/stage/bridge";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/motion";
import { VisitPanel } from "./VisitPanel";
import styles from "./Hero.module.css";

export function Hero() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom top",
        onUpdate: (st) => {
          bridge.scroll = st.progress;
        },
      });
      if (prefersReducedMotion()) return;
      // Exit: the statement lifts away faster than the mark, the readout last.
      gsap.to(el.querySelector("[data-lede]"), {
        yPercent: -60,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "55% top", scrub: true },
      });
      gsap.to(el.querySelector("[data-mark]"), {
        yPercent: 22,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });
    },
    { scope: root },
  );

  return (
    <StageWindow as="header" className={styles.hero}>
      <div ref={root} className={styles.inner}>
        <div className={styles.lede} data-lede>
          <h1 className={styles.statement}>
            We build the store. Then we build what brings the shopper back.
          </h1>
          <p className={styles.sub}>
            A web and app studio in Hyderabad, building a consent-first WhatsApp recovery platform for online
            brands.
          </p>
        </div>

        <div className={styles.mark} data-mark>
          <ReactiveLogo dataHeroLogo strength={16} />
        </div>

        <div className={styles.foot}>
          <VisitPanel />
          <nav className={styles.paths} aria-label="Start here">
            <TransitionLink href="/product" className={styles.path} data-cursor="view" data-cursor-label="Enter">
              <span className={styles.pathKey}>Product</span>
              <span className={styles.pathText}>Watch a lost shopper come back</span>
            </TransitionLink>
            <TransitionLink href="/services" className={styles.path} data-cursor="view" data-cursor-label="Enter">
              <span className={styles.pathKey}>Studio</span>
              <span className={styles.pathText}>Websites, apps and social</span>
            </TransitionLink>
          </nav>
        </div>
      </div>
    </StageWindow>
  );
}
