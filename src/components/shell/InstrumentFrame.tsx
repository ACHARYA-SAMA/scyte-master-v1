"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { rail, ui, useStore } from "@/lib/store";
import { routeFor } from "@/config/site";
import { scroller } from "@/components/providers/SmoothScroll";
import { pageChapters } from "./chapters";
import { SLOTS, junction, slotOf, storyNext, travelTo, visited } from "@/lib/junction";
import styles from "./InstrumentFrame.module.css";

const pad = (n: number, len: number) => String(Math.max(0, Math.round(n))).padStart(len, "0");

/**
 * The instrument frame: a hairline inset around the viewport, the way a viewfinder or
 * a flight display frames what it shows. Edge rulers whose ticks travel with the page;
 * a marker on the left ruler at the pointer's height and one on the bottom at its
 * x; the scroll position on the right. Corner readouts give the cursor's coordinates
 * and the frame rate, measured, not invented. Along the bottom, the page's chapters,
 * with a drop of light travelling between them. Everything is drawn from the real
 * state of the page; nothing on it is decoration that lies.
 *
 * Writes happen in the events that cause them (scroll, pointer) and in one small frame
 * counter, never as layout reads inside a frame.
 */
export function InstrumentFrame() {
  const pathname = usePathname();
  const route = routeFor(pathname);
  const chapters = useStore(rail, (s) => s.chapters);
  const active = useStore(rail, (s) => s.active);
  const scrub = useStore(rail, (s) => s.scrub);
  const menuOpen = useStore(ui, (s) => s.menuOpen);
  const root = useRef<HTMLDivElement>(null);
  const xy = useRef<HTMLSpanElement>(null);
  const fps = useRef<HTMLSpanElement>(null);
  const frame = useRef<HTMLSpanElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const [dense, setDense] = useState(false);
  const seen = useStore(visited, (s) => s.hrefs);
  const jphase = useStore(junction, (s) => s.phase);
  const here = slotOf(pathname);
  const next = SLOTS[storyNext(pathname)]!;
  const tease = useRef<HTMLParagraphElement>(null);

  // scroll: the rulers' ticks travel, the right marker rides the page, the drop moves
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const update = () => {
      const { progress, marks, active: a } = rail.get();
      el.style.setProperty("--sy", String(Math.round(window.scrollY)));
      el.style.setProperty("--p", progress.toFixed(4));
      if (pct.current) pct.current.textContent = pad(progress * 100, 3);
      // the drop sits between chapter labels, as far along as the reader is through the chapter
      const n = Math.max(1, rail.get().chapters.length);
      const from = marks[a] ?? 0;
      const to = marks[a + 1] ?? 1;
      const local = to > from ? Math.min(1, Math.max(0, (progress - from) / (to - from))) : 0;
      const pos = n > 1 ? Math.min(1, (a + (a < n - 1 ? local : 0)) / (n - 1)) : 0;
      el.style.setProperty("--drop", pos.toFixed(4));
      // the last stretch of a page points at what is beyond it
      const doc = document.documentElement;
      const end = window.scrollY / Math.max(1, doc.scrollHeight - window.innerHeight);
      const t = tease.current;
      if (t) {
        const on = end > 0.85 && junction.get().phase === "away" ? "1" : "0";
        if (t.dataset.on !== on) t.dataset.on = on;
      }
    };
    update();
    const stop = rail.subscribe(update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      stop();
      window.removeEventListener("scroll", update);
    };
  }, []);

  // pointer: two markers and the coordinate readout
  useEffect(() => {
    const el = root.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      el.style.setProperty("--mx", String(e.clientX));
      el.style.setProperty("--my", String(e.clientY));
      if (xy.current) xy.current.textContent = `X ${pad(e.clientX, 4)}  Y ${pad(e.clientY, 4)}`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // the frame rate, measured over half a second, and a frame count
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let total = 0;
    let since = performance.now();
    const loop = (now: number) => {
      frames++;
      total++;
      if (total % 4 === 0 && frame.current) frame.current.textContent = pad(total, 7);
      if (now - since >= 500) {
        if (fps.current && !document.hidden) fps.current.textContent = pad((frames * 1000) / (now - since), 3);
        frames = 0;
        since = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // too many chapters for the width: show only the current label, ticks for the rest
  useEffect(() => {
    const measure = () => setDense(chapters.length * 96 > window.innerWidth - 520);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [chapters.length]);

  const jump = (i: number) => {
    const target = pageChapters()[i]?.target;
    const el = target ? document.getElementById(target) : null;
    if (!el) return;
    if (scroller.lenis) scroller.lenis.scrollTo(el, { offset: 2 });
    else el.scrollIntoView({ behavior: "smooth" });
  };

  const n = chapters.length;

  return (
    <div ref={root} className={styles.frame} data-menu={menuOpen ? "1" : undefined} data-scrub={scrub ? "1" : undefined} data-dense={dense ? "1" : undefined}>
      <span className={styles.edge} data-side="t" aria-hidden />
      <span className={styles.edge} data-side="r" aria-hidden />
      <span className={styles.edge} data-side="b" aria-hidden />
      <span className={styles.edge} data-side="l" aria-hidden />
      <span className={styles.corner} data-c="tl" aria-hidden />
      <span className={styles.corner} data-c="tr" aria-hidden />
      <span className={styles.corner} data-c="br" aria-hidden />
      <span className={styles.corner} data-c="bl" aria-hidden />

      <div className={`${styles.ruler} ${styles.left}`} aria-hidden>
        <span className={styles.ticks} />
        <span className={styles.markY} />
        <span className={`${styles.vlabel} t-hud`}>
          {route?.chapter ?? "Lost"}
          {n ? (
            <>
              <span className={styles.gap} />
              {pad(active + 1, 2)} / {pad(n, 2)}
            </>
          ) : null}
        </span>
      </div>
      <div className={`${styles.ruler} ${styles.right}`} aria-hidden>
        <span className={styles.ticks} />
        <span className={styles.markP}>
          <span ref={pct} className="t-hud">
            000
          </span>
        </span>
      </div>
      <div className={`${styles.ruler} ${styles.bottom}`} aria-hidden>
        <span className={styles.markX} />
      </div>

      <span className={`${styles.readout} ${styles.bl} t-hud`} aria-hidden>
        <span ref={xy}>X 0000  Y 0000</span>
      </span>
      <span className={`${styles.readout} ${styles.br} t-hud`} aria-hidden>
        <span ref={fps}>060</span> FPS<span className={styles.gap} />F <span ref={frame}>0000000</span>
      </span>

      {/* the minimap: the six slots of the Junction, this page filled, pages seen on this device lit */}
      <nav className={styles.minimap} aria-label="Map of the site">
        <svg viewBox="0 0 76 40" className={styles.fan} aria-hidden>
          {SLOTS.map((s) => {
            const a = ((-38 + (76 / 5) * s.i) * Math.PI) / 180;
            return <line key={s.href} x1={38} y1={36} x2={38 + Math.sin(a) * 30} y2={36 - Math.cos(a) * 30} />;
          })}
          <circle cx={38} cy={36} r={2} />
        </svg>
        {SLOTS.map((s) => {
          const a = ((-38 + (76 / 5) * s.i) * Math.PI) / 180;
          return (
            <button
              key={s.href}
              type="button"
              className={styles.node}
              style={{ "--x": `${((38 + Math.sin(a) * 30) / 76) * 100}%`, "--y": `${((36 - Math.cos(a) * 30) / 40) * 100}%` } as CSSProperties}
              data-here={s.i === here ? "1" : undefined}
              data-seen={seen.includes(s.href) ? "1" : undefined}
              onClick={() => (s.i === here ? undefined : travelTo(s.i))}
              aria-label={s.i === here ? `${s.label}, you are here` : `Go to ${s.label}`}
              aria-current={s.i === here ? "page" : undefined}
            >
              <span className={`${styles.nodeTip} t-hud`}>{s.label}</span>
            </button>
          );
        })}
      </nav>
      <p ref={tease} className={`${styles.tease} t-hud`} data-on="0" data-junction={jphase === "away" ? undefined : "1"} aria-hidden>
        Keep scrolling: 6 paths ahead <span className={styles.teaseNext}>Next, {next.label}</span>
      </p>

      {n ? (
        <nav className={styles.strip} aria-label="Chapters on this page" style={{ "--n": n } as CSSProperties}>
          <span className={styles.stripLine} aria-hidden />
          <span className={styles.drop} aria-hidden />
          <ol className={styles.chapters}>
            {chapters.map((c, i) => (
              <li key={c.id} style={{ "--i": i } as CSSProperties} data-active={i === active ? "1" : undefined} data-past={i < active ? "1" : undefined}>
                <button type="button" className={`${styles.chapter} t-hud`} onClick={() => jump(i)} aria-current={i === active ? "step" : undefined}>
                  <span className={styles.tick} aria-hidden />
                  <span className={styles.chapterLabel}>{c.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
    </div>
  );
}
