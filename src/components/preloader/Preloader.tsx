"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { LOGO_ASPECT, LOGO_OVERSHOOT, LOGO_WIDTH, logoCells } from "@/lib/logo/geometry";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { ui } from "@/lib/store";
import { scroller } from "@/components/providers/SmoothScroll";
import { PRELOADED_KEY } from "./boot";
import styles from "./Preloader.module.css";

const STAGE_TIMEOUT_MS = 2400;

type Task = { id: string; label: string; weight: number; state: "waiting" | "ready" | "skipped" };

const INITIAL: Task[] = [
  { id: "dom", label: "Page", weight: 0.15, state: "waiting" },
  { id: "fonts", label: "Type", weight: 0.35, state: "waiting" },
  { id: "stage", label: "WebGL", weight: 0.5, state: "waiting" },
];

/**
 * The logo assembles cell by cell, driven by real work: hydration, font loading and
 * the WebGL context plus shader compile. At 100 % the cells hand over to the exact
 * vector mark, which flies into the hero (or the nav logo) as one continuous move.
 * Runs once per tab session.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const vector = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const [tasks, setTasks] = useState(INITIAL);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const done = document.documentElement.dataset.preloaded === "1";
    if (done) {
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
    const cnv = canvas.current;
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
    if (!el || !vec || !cnv) return end();

    const reduced = prefersReducedMotion();
    const destination =
      document.querySelector<HTMLElement>("[data-hero-logo]") ??
      document.querySelector<HTMLElement>("[data-nav-logo] svg");

    // Hand over from cells to the exact vector mark.
    const tl = gsap.timeline({ onComplete: end });
    tl.set(vec, { opacity: 1 });
    tl.to(cnv, { opacity: 0, duration: 0.12, ease: "none" });
    tl.to(el.querySelectorAll("[data-meta]"), { opacity: 0, duration: 0.2, ease: "cut" }, "<");

    if (reduced || !destination) {
      tl.to(el, { opacity: 0, duration: 0.35, ease: "none" });
      return;
    }

    const from = vec.getBoundingClientRect();
    const to = destination.getBoundingClientRect();
    const scale = to.width / from.width;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    tl.to(vec, { x: dx, y: dy, scale, duration: 0.95, ease: "latch" }, "+=0.08");
    tl.to(el.querySelector("[data-bg]"), { opacity: 0, duration: 0.55, ease: "drift" }, "<0.35");
    tl.set(destination, { opacity: 1 });
    tl.to(vec, { opacity: 0, duration: 0.01 });
  }, []);

  // Draw: cells are placed in a fixed scan order as progress rises.
  const shown = useRef(0);
  const cellsRef = useRef<ReturnType<typeof logoCells> | null>(null);
  useEffect(() => {
    if (!active) return;
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (!cellsRef.current) {
      const cells = logoCells(1);
      // Scan order: column sweeps with a little jitter, like a plotter laying ink.
      cells.sort((a, b) => a.x + ((a.y * 13) % 7) * 0.9 - (b.x + ((b.y * 13) % 7) * 0.9));
      cellsRef.current = cells;
    }
    const cells = cellsRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const w = c.clientWidth;
      c.width = Math.round(w * dpr);
      c.height = Math.round((w / LOGO_ASPECT) * dpr);
    };
    resize();

    const state = { p: shown.current };
    const tween = gsap.to(state, {
      p: target,
      duration: prefersReducedMotion() ? 0.01 : 0.9,
      ease: "drift",
      onUpdate: () => {
        shown.current = state.p;
        const n = Math.floor(cells.length * state.p);
        const s = c.width / LOGO_WIDTH;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.fillStyle = "#c2b897";
        for (let i = 0; i < n; i++) {
          const cell = cells[i];
          ctx.fillRect(cell.x * s, (cell.y + LOGO_OVERSHOOT) * s, s * 0.86, s * 0.86);
        }
        // the leading edge glows signal for a few cells
        ctx.fillStyle = "#ff3d2e";
        for (let i = Math.max(0, n - 6); i < n; i++) {
          const cell = cells[i];
          ctx.fillRect(cell.x * s, (cell.y + LOGO_OVERSHOOT) * s, s * 0.86, s * 0.86);
        }
        if (pctRef.current) pctRef.current.textContent = String(Math.round(state.p * 100)).padStart(3, "0");
      },
      onComplete: () => {
        if (state.p >= 0.999) finish();
      },
    });
    return () => {
      tween.kill();
    };
  }, [target, active, finish]);

  if (!active) return null;

  return (
    <div ref={root} className={styles.preloader} role="status" aria-live="polite" aria-label="Loading Scyte">
      <div className={styles.bg} data-bg />
      <div className={styles.stack}>
        <div className={styles.mark}>
          <canvas ref={canvas} className={styles.canvas} aria-hidden />
          <div ref={vector} className={styles.vector} aria-hidden>
            <Logo title={null} />
          </div>
        </div>
        <div className={styles.meta} data-meta>
          <dl className={styles.tasks}>
            {tasks.map((t) => (
              <div key={t.id} data-state={t.state}>
                <dt>{t.label}</dt>
                <dd>{t.state === "waiting" ? "loading" : t.state === "ready" ? "ready" : "deferred"}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.pct}>
            <span ref={pctRef} className="t-num">
              000
            </span>
            <span className={styles.pctSign}>%</span>
          </p>
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
