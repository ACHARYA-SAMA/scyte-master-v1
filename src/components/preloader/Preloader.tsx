"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { LOGO_CAP_HEIGHT, LOGO_OVERSHOOT, LOGO_PATH, LOGO_VIEWBOX, LOGO_WIDTH } from "@/lib/logo/geometry";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { ui } from "@/lib/store";
import { scroller } from "@/components/providers/SmoothScroll";
import { PRELOADED_KEY } from "./boot";
import styles from "./Preloader.module.css";

const STAGE_TIMEOUT_MS = 2600;
const H = LOGO_CAP_HEIGHT + LOGO_OVERSHOOT;

type Task = { id: string; label: string; weight: number; state: "waiting" | "ready" | "skipped" };

const INITIAL: Task[] = [
  { id: "dom", label: "Page", weight: 0.15, state: "waiting" },
  { id: "fonts", label: "Type", weight: 0.3, state: "waiting" },
  { id: "stage", label: "Light", weight: 0.55, state: "waiting" },
];

/** The surface of the liquid inside the letters, as an SVG path in logo units. */
const surfacePath = (level: number, t: number, closed: boolean) => {
  const y0 = -LOGO_OVERSHOOT + H * (1 - level);
  const amp = 0.9 * Math.sin(Math.PI * Math.min(1, level)) + 0.05;
  let d = "";
  for (let x = -2; x <= LOGO_WIDTH + 2; x += 2) {
    const y = y0 + Math.sin(x * 0.12 - t * 4) * amp + Math.sin(x * 0.31 + t * 2.6) * amp * 0.35;
    d += (x === -2 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(3);
  }
  if (closed) d += `L${LOGO_WIDTH + 2} ${H + 2}L-2 ${H + 2}Z`;
  return d;
};

/**
 * The wordmark fills with khaki from the bottom as real work completes: hydration,
 * the font, and the WebGL context with its shaders. Full is the exact mark, which then
 * flies into the hero (or the nav logo). Runs once per tab session.
 */
export function Preloader() {
  const clipId = useId().replace(/:/g, "");
  const root = useRef<HTMLDivElement>(null);
  const vector = useRef<HTMLDivElement>(null);
  const liquid = useRef<SVGPathElement>(null);
  const meniscus = useRef<SVGPathElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const [tasks, setTasks] = useState(INITIAL);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (document.documentElement.dataset.preloaded === "1") {
      // Decided by the boot script before paint; React learns it after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(false);
      ui.set({ preloaderDone: true });
      return;
    }
    scroller.lenis?.stop();
    const mark = (id: string, state: Task["state"] = "ready") =>
      setTasks((prev) => prev.map((t) => (t.id === id && t.state === "waiting" ? { ...t, state } : t)));

    mark("dom");
    document.fonts?.ready.then(() => mark("fonts"));

    const check = () => {
      const w = ui.get().webgl;
      if (w === "ready") mark("stage");
      if (w === "unsupported" || w === "deferred") mark("stage", "skipped");
    };
    check();
    const unsub = ui.subscribe(check);
    const timeout = window.setTimeout(() => mark("stage", "skipped"), STAGE_TIMEOUT_MS);
    return () => {
      unsub();
      window.clearTimeout(timeout);
    };
  }, []);

  const target = tasks.reduce((s, t) => s + (t.state === "waiting" ? 0 : t.weight), 0);

  const finished = useRef(false);
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const el = root.current;
    const vec = vector.current;
    try {
      sessionStorage.setItem(PRELOADED_KEY, "1");
    } catch {
      /* fine: it will simply run again next time */
    }
    const end = () => {
      document.documentElement.classList.remove("is-preloading");
      ui.set({ preloaderDone: true });
      if (ui.get().transition === "idle" && !ui.get().menuOpen) scroller.lenis?.start();
      setActive(false);
    };
    if (!el || !vec) return end();

    const reduced = prefersReducedMotion();
    const destination =
      document.querySelector<HTMLElement>("[data-hero-logo]") ??
      document.querySelector<HTMLElement>("[data-nav-logo] svg");

    const tl = gsap.timeline({ onComplete: end });
    // the full liquid mark and the exact vector are the same shape: swap them
    tl.set(vec, { opacity: 1 });
    tl.to(el.querySelectorAll("[data-meta]"), { opacity: 0, duration: 0.25, ease: "cut" });

    if (reduced || !destination) {
      tl.to(el, { opacity: 0, duration: 0.35, ease: "none" });
      return;
    }
    const from = vec.getBoundingClientRect();
    const to = destination.getBoundingClientRect();
    const scale = to.width / from.width;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    tl.to(vec, { x: dx, y: dy, scale, duration: 1, ease: "snap" }, "+=0.06");
    tl.to(el.querySelector("[data-bg]"), { opacity: 0, duration: 0.6, ease: "drift" }, "<0.35");
    tl.set(destination, { opacity: 1 });
    tl.to(vec, { opacity: 0, duration: 0.01 });
  }, []);

  // the level eases towards the share of finished work; the surface keeps moving
  const shown = useRef(0);
  useEffect(() => {
    if (!active) return;
    const state = { p: shown.current };
    let t = 0;
    const paint = () => {
      t += 1 / 60;
      liquid.current?.setAttribute("d", surfacePath(state.p, t, true));
      meniscus.current?.setAttribute("d", surfacePath(state.p, t, false));
      if (meniscus.current) meniscus.current.style.opacity = state.p > 0.995 ? "0" : "1";
    };
    gsap.ticker.add(paint);
    const tween = gsap.to(state, {
      p: target,
      duration: prefersReducedMotion() ? 0.01 : 1.1,
      ease: "pour",
      onUpdate: () => {
        shown.current = state.p;
        if (pctRef.current) pctRef.current.textContent = String(Math.round(state.p * 100)).padStart(3, "0");
      },
      onComplete: () => {
        if (state.p >= 0.999) {
          paint();
          finish();
        }
      },
    });
    return () => {
      tween.kill();
      gsap.ticker.remove(paint);
    };
  }, [target, active, finish]);

  if (!active) return null;

  return (
    <div ref={root} className={styles.preloader} role="status" aria-live="polite" aria-label="Loading Scyte">
      <div className={styles.bg} data-bg />
      <div className={styles.stack}>
        <div className={styles.mark}>
          <svg viewBox={LOGO_VIEWBOX} className={styles.vessel} aria-hidden overflow="visible">
            <defs>
              <clipPath id={clipId}>
                <path d={LOGO_PATH} />
              </clipPath>
            </defs>
            <path d={LOGO_PATH} className={styles.glass} />
            <g clipPath={`url(#${clipId})`}>
              <path ref={liquid} className={styles.liquid} />
              <path ref={meniscus} className={styles.meniscus} />
            </g>
          </svg>
          <div ref={vector} className={styles.vector} aria-hidden>
            <Logo title={null} />
          </div>
        </div>
        <div className={styles.meta} data-meta>
          <dl className={styles.tasks}>
            {tasks.map((t) => (
              <div key={t.id} data-state={t.state}>
                <dt className="t-hud">{t.label}</dt>
                <dd className="t-hud">{t.state === "waiting" ? "loading" : t.state === "ready" ? "ready" : "later"}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.pct}>
            <span ref={pctRef} className="t-num">
              000
            </span>
          </p>
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
