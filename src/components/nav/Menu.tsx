"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { useStore, ui } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { scroller } from "@/components/providers/SmoothScroll";
import { TransitionLink } from "@/components/transition/navigation";
import { PRODUCT_NAME, SITE } from "@/config/site";
import styles from "./Menu.module.css";

const LINKS = [
  { href: "/", label: "Home", note: "Where the instrument starts" },
  { href: "/product", label: "Product", note: `${PRODUCT_NAME}: WhatsApp recovery for online stores` },
  { href: "/services", label: "Studio", note: "Websites, mobile apps, social media" },
  { href: "/work", label: "Work", note: "What we have shipped" },
  { href: "/team", label: "Team", note: "The people who build it" },
  { href: "/contact", label: "Contact", note: "Book a 20-minute store audit" },
];

const COLS = 10;
const ROWS = 6;

export function Menu() {
  const open = useStore(ui, (s) => s.menuOpen);
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const cells = el.querySelectorAll("[data-cell]");
    const items = el.querySelectorAll("[data-item]");
    const foot = el.querySelectorAll("[data-foot]");
    tl.current?.kill();

    if (open) {
      lastFocus.current = document.activeElement as HTMLElement | null;
      scroller.lenis?.stop();
      el.dataset.open = "1";
      sfx.slice();
      const t = gsap.timeline();
      if (reduced) {
        t.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        gsap.set([cells, items, foot], { clearProps: "all" });
      } else {
        t.set(el, { opacity: 1 });
        t.fromTo(
          cells,
          { scaleY: 0 },
          {
            scaleY: 1,
            duration: 0.42,
            ease: "latch",
            transformOrigin: "50% 0%",
            stagger: { grid: [ROWS, COLS], from: "end", amount: 0.3 },
          },
        );
        t.fromTo(
          items,
          { yPercent: 110 },
          { yPercent: 0, duration: 0.6, ease: "glide", stagger: 0.045 },
          "-=0.25",
        );
        t.fromTo(foot, { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.05 }, "-=0.35");
      }
      tl.current = t;
      requestAnimationFrame(() => el.querySelector<HTMLElement>("a")?.focus({ preventScroll: true }));
    } else if (el.dataset.open === "1") {
      const t = gsap.timeline({
        onComplete: () => {
          el.dataset.open = "0";
          gsap.set(el, { opacity: 0 });
        },
      });
      if (!reduced) {
        t.to(items, { yPercent: -110, duration: 0.3, ease: "cut", stagger: 0.02 });
        t.to(
          cells,
          {
            scaleY: 0,
            duration: 0.32,
            ease: "cut",
            transformOrigin: "50% 100%",
            stagger: { grid: [ROWS, COLS], from: "start", amount: 0.22 },
          },
          "-=0.15",
        );
      }
      tl.current = t;
      if (ui.get().transition === "idle") scroller.lenis?.start();
      lastFocus.current?.focus?.({ preventScroll: true });
    }
  }, [open]);

  // Restart scrolling after a navigation that closed the menu.
  useEffect(() => {
    if (!open) scroller.lenis?.start();
  }, [pathname, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ui.set({ menuOpen: false });
      if (e.key !== "Tab" || !root.current) return;
      const focusables = root.current.querySelectorAll<HTMLElement>("a, button");
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      ref={root}
      id="site-menu"
      className={styles.menu}
      data-open="0"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      aria-hidden={!open}
      inert={!open}
    >
      <div className={styles.cells} aria-hidden>
        {Array.from({ length: COLS * ROWS }, (_, i) => (
          <span key={i} data-cell />
        ))}
      </div>
      <nav className={styles.inner} aria-label="Primary">
        <ul className={styles.list}>
          {LINKS.map((link) => (
            <li key={link.href} className={styles.row}>
              <div className={styles.mask}>
                <TransitionLink
                  href={link.href}
                  className={styles.link}
                  data-item
                  aria-current={pathname === link.href ? "page" : undefined}
                  onClick={() => ui.set({ menuOpen: false })}
                >
                  <span className={styles.label}>
                    {Array.from(link.label).map((ch, i) => (
                      <span key={i} className={styles.ch} style={{ "--i": i } as React.CSSProperties}>
                        <span className={styles.chi} data-ch={ch}>
                          {ch}
                        </span>
                      </span>
                    ))}
                  </span>
                  <span className={styles.note}>{link.note}</span>
                </TransitionLink>
              </div>
            </li>
          ))}
        </ul>
        <div className={styles.foot}>
          <a href={`mailto:${SITE.email}`} data-foot>
            {SITE.email}
          </a>
          <span data-foot>{SITE.city}, India</span>
          <a href={SITE.socials.instagram} target="_blank" rel="noopener noreferrer" data-foot>
            Instagram
          </a>
          <a href={SITE.socials.linkedin} target="_blank" rel="noopener noreferrer" data-foot>
            LinkedIn
          </a>
        </div>
      </nav>
    </div>
  );
}
