"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SliceWord, type Face } from "@/components/brand/SliceWord";
import { GLYPHS, LOGO_STROKE, glyphPath } from "@/lib/logo/geometry";
import { ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { visit } from "@/lib/telemetry";
import styles from "./ProofStack.module.css";

/** Measured on this page load, in this browser. */
function usePageMetrics() {
  const [lcp, setLcp] = useState<number | null>(null);
  const [kb, setKb] = useState<number | null>(null);
  useEffect(() => {
    let po: PerformanceObserver | null = null;
    try {
      po = new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1);
        if (last) setLcp(last.startTime);
      });
      po.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      /* not supported: the line falls back to its unmeasured wording */
    }
    const sum = () => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const bytes = (nav?.transferSize ?? 0) + res.reduce((s, r) => s + (r.transferSize || 0), 0);
      if (bytes > 0) setKb(Math.round(bytes / 1024));
    };
    const id = window.setTimeout(sum, 1500);
    return () => {
      po?.disconnect();
      window.clearTimeout(id);
    };
  }, []);
  return { lcp, kb };
}

function GridProof() {
  const s = GLYPHS[0];
  return (
    <svg className={styles.gridProof} viewBox="-2 -2 33 41" aria-label="The S of the logo on its 5-unit grid">
      <defs>
        <pattern id="cells" width={LOGO_STROKE} height={LOGO_STROKE} patternUnits="userSpaceOnUse">
          <path d={`M${LOGO_STROKE} 0H0V${LOGO_STROKE}`} fill="none" stroke="currentColor" strokeWidth="0.12" />
        </pattern>
      </defs>
      <path d={glyphPath(s)} fill="currentColor" opacity="0.92" />
      <rect x="0" y="0" width="30" height="40" fill="url(#cells)" className={styles.gridLines} />
      <path d="M1 32V37" stroke="var(--signal)" strokeWidth="0.5" />
      <text x="2" y="39.4" className={styles.gridNote}>
        1 unit in
      </text>
    </svg>
  );
}

export function ProofStack() {
  const root = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const { lcp, kb } = usePageMetrics();
  const events = useStore(visit, (v) => v.events);

  const items = useMemo(
    () => [
      {
        word: "Fast",
        proof: (
          <>
            <p>
              {lcp !== null ? (
                <>
                  The largest thing on this page painted in <strong className="t-num">{(lcp / 1000).toFixed(2)} s</strong>{" "}
                  on your device
                  {kb !== null ? (
                    <>
                      , after <strong className="t-num">{kb} KB</strong> came down the wire
                    </>
                  ) : null}
                  .
                </>
              ) : (
                <>We measure every page we ship on a budget phone over mobile data, not on our own laptops.</>
              )}
            </p>
            <p className={styles.small}>Measured live in your browser with the Performance API. Nothing is sent.</p>
          </>
        ),
      },
      {
        word: "Exact",
        proof: (
          <>
            <p>
              Every moving part of this site snaps to a 5-unit grid: the stroke width of the letters in our name. Even
              the S keeps its notch, one unit in.
            </p>
            <GridProof />
          </>
        ),
      },
      {
        word: "Tactile",
        proof: (
          <>
            <p>
              The matrix behind the hero recorded your cursor. That is what our platform does for a store: it notices
              engaged time, dwell and depth, not page views.
            </p>
            <p className={styles.small}>
              <strong className="t-num">{events}</strong> events from you so far. All of them stayed in this tab.
            </p>
          </>
        ),
      },
      {
        word: "Honest",
        proof: (
          <>
            <p>
              No invented numbers, logos or testimonials anywhere on this site. Where our own report says illustrative,
              so do we. Where we have no proof yet, you will see this:
            </p>
            <p>
              <span className="fill">[ FILL ]</span>
            </p>
          </>
        ),
      },
      {
        word: "Local",
        proof: (
          <p>
            Rupees, UPI, COD and return-to-origin. Templates in Hindi, Telugu and Hinglish. Built in Hyderabad for
            Indian checkouts first.
          </p>
        ),
      },
    ],
    [lcp, kb, events],
  );

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const reduced = prefersReducedMotion();
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: () => `+=${window.innerHeight * (items.length - 0.4)}`,
        pin: el.querySelector("[data-pin]"),
        pinSpacing: true,
        onUpdate: (st) => {
          const i = Math.min(items.length - 1, Math.floor(st.progress * items.length));
          setIndex(i);
          const bar = el.querySelector<HTMLElement>("[data-bar]");
          if (bar && !reduced) bar.style.transform = `scaleX(${st.progress})`;
        },
      });
    },
    { scope: root, dependencies: [items.length] },
  );

  const face: Face = useMemo(() => ({ id: items[index].word, kind: "text", text: items[index].word }), [index, items]);

  return (
    <section ref={root} className={styles.section} aria-labelledby="proof-title">
      <h2 id="proof-title" className="sr-only">
        What we hold ourselves to
      </h2>
      <div className={styles.pin} data-pin>
        <div className={styles.word}>
          <SliceWord face={face} origin={index % 2 ? 27 : 0} label={items[index].word} />
        </div>
        <div className={styles.side}>
          <ol className={styles.ticks} aria-hidden>
            {items.map((it, i) => (
              <li key={it.word} data-on={i === index ? "1" : undefined} data-done={i < index ? "1" : undefined}>
                {it.word}
              </li>
            ))}
          </ol>
          <div className={styles.proof} aria-live="polite">
            {items[index].proof}
          </div>
          <span className={styles.bar} data-bar aria-hidden />
        </div>
      </div>
    </section>
  );
}
