"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ScrollTrigger } from "@/lib/motion";
import { scrollToY } from "@/components/providers/SmoothScroll";
import { sfx } from "@/lib/sound";
import styles from "./AuditThrough.module.css";

const STEPS = [
  { when: "Before the call", what: "We go through your store as a shopper would: product pages, checkout, payment methods, how much is cash on delivery, the messages you send today." },
  { when: "On the call", what: "Twenty minutes. We show you where it leaks, with screenshots, and what we would fix first." },
  { when: "After", what: "A short written summary. If our platform is not the right fix, we say so." },
];

/** What a summary looks like, for a fictional store. Every line is an example, not a finding about anyone. */
const PAGES = [
  {
    title: "Page 1: where it leaks",
    rows: [
      ["Checkout", "Phone number asked at step 2, no consent box"],
      ["Payments", "UPI only on mobile; no retry link after a timeout"],
      ["COD", "Offered on every order; no confirmation before dispatch"],
      ["Messages", "One order update, nothing for a failed payment"],
    ],
  },
  {
    title: "Page 2: what we would do first",
    rows: [
      ["1", "Add a consent box beside the phone field"],
      ["2", "Payment-failed rescue, with a holdout"],
      ["3", "COD confirmation for orders over ₹1,000"],
      ["4", "Review in week four, against the holdout"],
    ],
  },
];

/**
 * K4, the audit explained as a scroll-through: before, on and after the call, a step
 * per stretch of scroll, beside a sample summary you can turn over.
 */
export function AuditThrough() {
  const root = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);
  const [page, setPage] = useState(0);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (s) => {
        const k = Math.min(STEPS.length - 1, Math.floor(s.progress * STEPS.length));
        setI((cur) => (cur === k ? cur : k));
        el.style.setProperty("--p", s.progress.toFixed(4));
      },
    });
    return () => st.kill();
  }, []);
  // the summary turns to its second page as the story reaches "After"
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the page follows the scroll, and the visitor can still turn it back
    setPage(i === STEPS.length - 1 ? 1 : 0);
  }, [i]);
  const go = (k: number) => {
    const el = root.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollToY(top + ((k + 0.15) / STEPS.length) * (el.offsetHeight - window.innerHeight), 0.9);
  };
  return (
    <section ref={root} className={styles.section} aria-labelledby="audit-title" style={{ "--n": STEPS.length } as CSSProperties} data-avoid-pill>
      <div className={styles.sticky}>
        <header className={styles.head}>
          <p className={`${styles.kicker} t-hud`}>The 20-minute store audit</p>
          <h2 id="audit-title" className={styles.title}>
            Before the call, on the call, after.
          </h2>
        </header>
        <ol className={styles.steps}>
          {STEPS.map((s, k) => (
            <li key={s.when} data-on={k === i ? "1" : undefined} data-past={k < i ? "1" : undefined}>
              <button type="button" onClick={() => go(k)} aria-current={k === i ? "step" : undefined}>
                <span className={styles.stepN}>{String(k + 1).padStart(2, "0")}</span>
                <span className={`${styles.when} t-hud`}>{s.when}</span>
                <span className={styles.what}>{s.what}</span>
                <span className={styles.bar} aria-hidden>
                  <span />
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className={styles.report}>
          <p className={`${styles.sample} t-hud`}>Sample summary, for a fictional store</p>
          <button
            type="button"
            className={styles.sheet}
            data-page={page}
            onClick={() => {
              setPage((p) => (p ? 0 : 1));
              sfx.slice();
            }}
            aria-label={`Sample summary, ${PAGES[page]!.title}. Press to turn the page.`}
            data-cursor="tap"
            data-cursor-label="Turn"
          >
            {PAGES.map((pg, k) => (
              <span key={pg.title} className={styles.page} data-side={k} aria-hidden={k !== page}>
                <span className={`${styles.pageTitle} t-hud`}>{pg.title}</span>
                <span className={styles.rows}>
                  {pg.rows.map(([a, b]) => (
                    <span key={a} className={styles.row}>
                      <b>{a}</b>
                      <span>{b}</span>
                    </span>
                  ))}
                </span>
                <span className={styles.foot}>Demo store, example only. Your summary is about your store.</span>
              </span>
            ))}
          </button>
        </div>
      </div>
    </section>
  );
}
