"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { useStore, ui, type MotionChoice, type PerfChoice } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { setMotion, setPerf, toggleSound } from "@/lib/prefs";
import { scroller } from "@/components/providers/SmoothScroll";
import { TransitionLink } from "@/components/transition/navigation";
import { CopyEmail } from "@/components/shell/CopyEmail";
import { NAV, SITE } from "@/config/site";
import { Clock } from "./Nav";
import styles from "./Menu.module.css";

const MOTION: { value: MotionChoice; label: string }[] = [
  { value: "auto", label: "System" },
  { value: "full", label: "Full" },
  { value: "reduced", label: "Reduced" },
];

const PERF: { value: PerfChoice; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "Low" },
];

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className={styles.setting} role="radiogroup" aria-label={label}>
      <span className={`${styles.settingLabel} t-hud`}>{label}</span>
      <span className={styles.segments}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={`${styles.segment} t-hud`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </span>
    </div>
  );
}

/**
 * The menu drops as five tall glass columns, the logo's own strokes, each filling with
 * light from the top. A column is a route: hover widens it and shows where it goes.
 */
export function Menu({ returnFocus }: { returnFocus: RefObject<HTMLButtonElement | null> }) {
  const open = useStore(ui, (s) => s.menuOpen);
  const soundOn = useStore(ui, (s) => s.soundOn);
  const motion = useStore(ui, (s) => s.motion);
  const perf = useStore(ui, (s) => s.perf);
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  // previews are fetched the first time the menu opens, not with the page
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-way latch on first open
    if (open) setSeen(true);
  }, [open]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const cols = el.querySelectorAll("[data-col]");
    const fills = el.querySelectorAll("[data-fill]");
    const menisci = el.querySelectorAll("[data-meniscus]");
    const items = el.querySelectorAll("[data-item]");
    const foot = el.querySelectorAll("[data-foot]");
    tl.current?.kill();

    if (open) {
      scroller.lenis?.stop();
      el.dataset.open = "1";
      sfx.pour();
      const t = gsap.timeline();
      if (reduced) {
        t.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none" });
        gsap.set([cols, fills, items, foot], { clearProps: "all" });
        gsap.set(menisci, { opacity: 0 });
      } else {
        t.set(el, { opacity: 1 });
        t.fromTo(cols, { yPercent: -100 }, { yPercent: 0, duration: 0.62, ease: "snap", stagger: 0.06 });
        t.fromTo(fills, { scaleY: 0 }, { scaleY: 1, duration: 0.9, ease: "pour", stagger: 0.06 }, 0.12);
        t.fromTo(menisci, { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "none", stagger: 0.06 }, 0.75);
        t.fromTo(items, { yPercent: 105 }, { yPercent: 0, duration: 0.7, ease: "glide", stagger: 0.05 }, 0.32);
        t.fromTo(foot, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.04 }, 0.6);
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
      if (reduced) t.to(el, { opacity: 0, duration: 0.15, ease: "none" });
      else {
        t.to(items, { yPercent: -105, duration: 0.3, ease: "cut", stagger: 0.02 });
        t.to(cols, { yPercent: -100, duration: 0.5, ease: "cut", stagger: { each: 0.045, from: "end" } }, 0.12);
      }
      tl.current = t;
      if (ui.get().transition === "idle") scroller.lenis?.start();
      returnFocus.current?.focus({ preventScroll: true });
    }
  }, [open, returnFocus]);

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
      <nav className={styles.columns} aria-label="Primary">
        {NAV.map((r) => {
          const current = pathname === r.href || pathname.startsWith(r.href + "/");
          return (
            <div key={r.href} className={styles.col} data-col data-current={current ? "1" : undefined}>
              <span className={styles.fill} data-fill aria-hidden>
                <span className={styles.meniscus} data-meniscus />
              </span>
              <TransitionLink
                href={r.href}
                className={styles.link}
                aria-current={current ? "page" : undefined}
                onClick={() => ui.set({ menuOpen: false })}
                data-cursor="open"
              >
                <span className={styles.top}>
                  <span className="t-hud c-muted">{r.index}</span>
                  <span className={`${styles.chapterName} t-hud`}>{r.chapter}</span>
                </span>
                <span className={styles.blurb}>
                  {seen ? (
                    // a real screenshot of the page, 480 x 300
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.preview} src={`/shots${r.href}.webp`} alt="" width={480} height={300} decoding="async" />
                  ) : null}
                  <span className="t-small">{r.blurb}</span>
                </span>
                <span className={styles.mask}>
                  <span className={styles.label} data-item>
                    {r.label}
                  </span>
                </span>
              </TransitionLink>
            </div>
          );
        })}
      </nav>
      <div className={styles.foot}>
        <div className={styles.settings} data-foot>
          <div className={styles.setting}>
            <span className={`${styles.settingLabel} t-hud`}>Sound</span>
            <button type="button" className={`${styles.segment} t-hud`} aria-pressed={soundOn} onClick={toggleSound}>
              {soundOn ? "On" : "Off"}
            </button>
          </div>
          <Segmented label="Motion" value={motion} options={MOTION} onChange={setMotion} />
          <Segmented label="Performance" value={perf} options={PERF} onChange={setPerf} />
        </div>
        <div className={styles.contact} data-foot>
          <CopyEmail className="t-small" />
          <a href={SITE.socials.instagram} target="_blank" rel="noopener noreferrer" className="t-small">
            Instagram
          </a>
          <a href={SITE.socials.linkedin} target="_blank" rel="noopener noreferrer" className="t-small">
            LinkedIn
          </a>
          <span className="t-hud c-muted">
            {SITE.city} <Clock />
          </span>
        </div>
      </div>
    </div>
  );
}
