"use client";

import { useEffect, useRef, useState } from "react";
import { rail, ui, useStore } from "@/lib/store";
import { scroller } from "@/components/providers/SmoothScroll";
import { ScrollTrigger } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { pageChapters } from "./chapters";
import styles from "./Rail.module.css";

const TICKS = 48;

const scrollToFraction = (f: number, immediate = false) => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const y = Math.max(0, Math.min(max, f * max));
  if (scroller.lenis) scroller.lenis.scrollTo(y, { immediate, force: true, lerp: immediate ? 1 : 0.12 });
  else window.scrollTo({ top: y, behavior: immediate ? "auto" : "smooth" });
};

/**
 * The instrument tape on the right edge: minor ticks, a major tick and label per
 * chapter, and a bug that rides the scroll position. Labels jump to their chapter.
 * When the page asks for it, the bug is a playhead you can drag to scrub the page.
 */
export function Rail() {
  const chapters = useStore(rail, (s) => s.chapters);
  const active = useStore(rail, (s) => s.active);
  const scrub = useStore(rail, (s) => s.scrub);
  const menuOpen = useStore(ui, (s) => s.menuOpen);
  // whole percent only, so scrubbing re-renders at most a hundred times a page
  const scrubPct = useStore(rail, (s) => (s.scrub ? Math.round(s.progress * 100) : 0));
  const [marks, setMarks] = useState<number[]>([]);
  const bug = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // where each chapter starts, as a fraction of the scrollable height
  useEffect(() => {
    if (!chapters.length) return;
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const list = pageChapters().map((c) => {
        const el = document.getElementById(c.target);
        if (!el || max <= 0) return 0;
        const top = el.getBoundingClientRect().top + window.scrollY;
        return Math.min(1, Math.max(0, top / max));
      });
      setMarks(list);
    };
    measure();
    ScrollTrigger.addEventListener("refresh", measure);
    window.addEventListener("resize", measure);
    return () => {
      ScrollTrigger.removeEventListener("refresh", measure);
      window.removeEventListener("resize", measure);
    };
  }, [chapters]);

  useEffect(() => {
    let raf = 0;
    let lastActive = -1;
    // read layout in the scroll event and on resize, never inside the frame callback,
    // where it would force a full-page layout after the animation code's writes
    let y = window.scrollY;
    let max = document.documentElement.scrollHeight - window.innerHeight;
    const measureMax = () => {
      max = document.documentElement.scrollHeight - window.innerHeight;
    };
    const update = () => {
      raf = 0;
      const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      if (bug.current) bug.current.style.setProperty("--p", String(p));
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      if (pct.current) pct.current.textContent = String(Math.round(p * 100)).padStart(3, "0");
      let a = 0;
      marks.forEach((m, i) => {
        if (p + 0.002 >= m) a = i;
      });
      if (a !== lastActive) {
        lastActive = a;
        rail.set({ active: a, progress: p });
      } else rail.set({ progress: p });
    };
    const onScroll = () => {
      y = window.scrollY;
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      measureMax();
      onScroll();
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    ScrollTrigger.addEventListener("refresh", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ScrollTrigger.removeEventListener("refresh", onResize);
      cancelAnimationFrame(raf);
    };
  }, [marks]);

  // playhead scrubbing
  useEffect(() => {
    const el = track.current;
    if (!el || !scrub) return;
    const fraction = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    };
    const down = (e: PointerEvent) => {
      dragging.current = true;
      el.setPointerCapture(e.pointerId);
      scrollToFraction(fraction(e), true);
      sfx.tick();
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      scrollToFraction(fraction(e), true);
    };
    const up = () => {
      dragging.current = false;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [scrub]);

  if (!chapters.length) return null;

  return (
    <>
      <nav className={styles.rail} aria-label="Chapters on this page" data-hidden={menuOpen ? "1" : undefined} data-scrub={scrub ? "1" : undefined}>
        <div
          ref={track}
          className={styles.track}
          data-cursor={scrub ? "scrub" : undefined}
          role={scrub ? "slider" : undefined}
          aria-label={scrub ? "Scrub through the page" : undefined}
          aria-valuemin={scrub ? 0 : undefined}
          aria-valuemax={scrub ? 100 : undefined}
          aria-valuenow={scrub ? scrubPct : undefined}
          aria-valuetext={scrub ? `${scrubPct} percent, ${chapters[active]?.label ?? ""}` : undefined}
          tabIndex={scrub ? 0 : undefined}
          onKeyDown={
            scrub
              ? (e) => {
                  const step = e.shiftKey ? 0.1 : 0.02;
                  if (e.key === "ArrowDown" || e.key === "ArrowRight") scrollToFraction(rail.get().progress + step);
                  if (e.key === "ArrowUp" || e.key === "ArrowLeft") scrollToFraction(rail.get().progress - step);
                }
              : undefined
          }
        >
          <span className={styles.line} aria-hidden />
          {Array.from({ length: TICKS + 1 }, (_, i) => (
            <span key={i} className={styles.tick} style={{ top: `${(i / TICKS) * 100}%` }} aria-hidden />
          ))}
          <div ref={bug} className={styles.bug} aria-hidden>
            <span className={styles.bugMark} />
            <span ref={pct} className={`${styles.pct} t-hud`}>
              000
            </span>
          </div>
        </div>
        <ol className={styles.chapters}>
          {chapters.map((c, i) => (
            <li key={c.id} style={{ top: `${(marks[i] ?? i / chapters.length) * 100}%` }} data-active={i === active ? "1" : undefined}>
              <button
                type="button"
                className={`${styles.chapter} t-hud`}
                onClick={() => {
                  const target = pageChapters()[i]?.target;
                  const el = target ? document.getElementById(target) : null;
                  if (el && scroller.lenis) scroller.lenis.scrollTo(el, { offset: 2 });
                  else el?.scrollIntoView({ behavior: "smooth" });
                }}
                aria-current={i === active ? "step" : undefined}
              >
                {c.mark ? <span className={styles.mark}>{c.mark}</span> : null}
                <span className={styles.chapterLabel}>{c.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className={styles.mobile} aria-hidden>
        <div ref={bar} className={styles.mobileBar} />
      </div>
    </>
  );
}
