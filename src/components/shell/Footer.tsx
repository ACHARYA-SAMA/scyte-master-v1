"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { TransitionLink } from "@/components/transition/navigation";
import { Clock } from "@/components/nav/Nav";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/motion";
import { session, useStore } from "@/lib/store";
import { ROUTES, SITE } from "@/config/site";
import { CopyEmail } from "./CopyEmail";
import styles from "./Footer.module.css";

/** The closing band: the offer, the ways in, and the exact wordmark rising from below. */
export function Footer() {
  const pathname = usePathname();
  const root = useRef<HTMLElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const recovered = useStore(session, (s) => s.recovered);

  useEffect(() => {
    const el = root.current;
    const m = mark.current;
    if (!el || !m || prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      m,
      { yPercent: 58 },
      {
        yPercent: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom bottom", scrub: true },
      },
    );
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      window.removeEventListener("load", refresh);
    };
  }, [pathname]);

  return (
    <footer ref={root} className={styles.footer}>
      <div className={`${styles.top} frame`}>
        <div className={styles.offer}>
          <p className={`${styles.closing} t-h1`}>Tell us where your store leaks.</p>
          <div className={styles.offerActions}>
            <TransitionLink href="/contact?intent=audit" className={styles.cta} data-magnetic data-cursor="open">
              Book a 20-minute store audit
            </TransitionLink>
            <CopyEmail big />
          </div>
        </div>

        <nav className={styles.cols} aria-label="Footer">
          <div>
            <p className={`${styles.head} t-hud`}>Pages</p>
            <ul>
              {ROUTES.map((r) => (
                <li key={r.href}>
                  <TransitionLink href={r.href} className={styles.link} aria-current={pathname === r.href ? "page" : undefined}>
                    {r.label}
                    <span className={`${styles.chapter} t-hud`}>{r.chapter}</span>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={`${styles.head} t-hud`}>Elsewhere</p>
            <ul>
              <li>
                <a className={styles.link} href={SITE.socials.instagram} target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
              </li>
              <li>
                <a className={styles.link} href={SITE.socials.linkedin} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
              </li>
              <li>
                <a className={styles.link} href={`mailto:${SITE.email}`}>
                  Email
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className={`${styles.head} t-hud`}>Studio</p>
            <ul className={styles.facts}>
              <li>{SITE.city}, India</li>
              <li className="t-num">17.385° N, 78.487° E</li>
              <li>
                <Clock />
              </li>
            </ul>
          </div>
          <div>
            <p className={`${styles.head} t-hud`}>This visit</p>
            <p className={styles.visit}>
              Orders you recovered: <b className="t-fig">{recovered}</b>
              <span className={`${styles.visitNote} t-small`}>
                {recovered ? "Counted in this tab only." : "Run a phone on the home or product page."}
              </span>
            </p>
          </div>
        </nav>
      </div>

      <div className={styles.markWrap} aria-hidden>
        <div ref={mark} className={styles.mark}>
          <Logo title={null} />
        </div>
      </div>

      <div className={`${styles.base} frame t-hud`}>
        <span>© {new Date().getFullYear()} Scyte</span>
        <span>Set in Archivo. Built in Hyderabad.</span>
        <span>No cookies. No trackers.</span>
      </div>
    </footer>
  );
}
