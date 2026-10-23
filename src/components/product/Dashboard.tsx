"use client";

import { useEffect, useRef, useState } from "react";
import { CUMULATIVE, DAILY } from "@/data/dashboard";
import { rupees } from "@/lib/economics";
import { ScrollTrigger } from "@/lib/motion";
import { LaptopShell, type DockItem, type LaptopHandle } from "@/components/kit/LaptopShell";
import { DASH_SECTIONS, DashboardApp, SampleRibbon } from "./dashboard/DashboardApp";
import styles from "./Dashboard.module.css";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const glyph = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/**
 * P10, the instrument cluster: the client dashboard running on a laptop with a
 * standard 16:10 screen. The lid opens as the section arrives; while it is pinned the
 * page scrolls the dashboard; point at the screen to scroll it yourself. The list in
 * the copy column follows the dashboard and jumps it.
 */
export function Dashboard() {
  const section = useRef<HTMLElement>(null);
  const laptop = useRef<LaptopHandle>(null);
  const offsets = useRef<number[]>([]);
  const [active, setActive] = useState<string>(DASH_SECTIONS[0].id);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const lid = ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      end: "top 10%",
      scrub: true,
      onUpdate: (self) => laptop.current?.lid(self.progress),
      onRefresh: (self) => laptop.current?.lid(self.progress),
    });
    const pin = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => laptop.current?.scrub(clamp01((self.progress - 0.03) / 0.92)),
    });
    return () => {
      lid.kill();
      pin.kill();
    };
  }, []);

  const measure = () => {
    offsets.current = DASH_SECTIONS.map((s) => document.getElementById(s.id)?.offsetTop ?? 0);
  };
  const onInner = (y: number) => {
    if (!offsets.current.length || offsets.current.every((o) => o === 0)) measure();
    let i = 0;
    offsets.current.forEach((o, k) => {
      if (y + 140 >= o) i = k;
    });
    const id = DASH_SECTIONS[i]!.id;
    setActive((a) => (a === id ? a : id));
  };
  const jump = (id: string) => {
    measure();
    const i = DASH_SECTIONS.findIndex((s) => s.id === id);
    laptop.current?.scrollTo(Math.max(0, (offsets.current[i] ?? 0) - 16));
  };

  const dock: DockItem[] = [
    { id: "dash", label: "Dashboard", glyph: glyph("M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z"), on: true, onClick: () => jump(DASH_SECTIONS[0].id) },
    { id: "flows", label: "Flows", glyph: glyph("M4 6h10M4 12h16M4 18h7"), onClick: () => jump("dash-flows") },
    { id: "holdout", label: "Holdout", glyph: glyph("M4 19l5-6 4 3 7-9"), onClick: () => jump("dash-holdout") },
    { id: "cod", label: "COD", glyph: glyph("M12 3a9 9 0 1 0 9 9M12 12l5-5"), onClick: () => jump("dash-cod") },
  ];

  const last = CUMULATIVE[CUMULATIVE.length - 1]!;

  return (
    <section ref={section} className={styles.section} aria-labelledby="dash-title" data-avoid-pill>
      <div className={styles.sticky}>
        <div className={styles.copy}>
          <p className={styles.flag}>Sample data. Not a client, not a pilot, not a result.</p>
          <h2 id="dash-title" className={styles.title}>
            What a client opens every morning.
          </h2>
          <p className={styles.lede}>
            One screen for the pilot: what was sent, what came back, and the gap against the holdout that proves it. Scroll, or point at
            the screen and scroll it yourself.
          </p>
          <ol className={styles.spy} aria-label="Dashboard sections">
            {DASH_SECTIONS.map((s, i) => (
              <li key={s.id}>
                <button type="button" data-on={active === s.id ? "1" : undefined} onClick={() => jump(s.id)} data-cursor="open">
                  <span className={styles.spyIndex}>{String(i + 1).padStart(2, "0")}</span>
                  {s.label}
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className={styles.stage}>
          <LaptopShell ref={laptop} label="The client dashboard, on sample data" app="Recovery" menu={["File", "View", "Flows", "Window", "Help"]} dock={dock} overlay={<SampleRibbon />} onInnerScroll={onInner}>
            <DashboardApp active={active} />
          </LaptopShell>
        </div>
      </div>
      <details className={styles.dataTable}>
        <summary>The dashboard&rsquo;s chart data as a table</summary>
        <table className={styles.table}>
          <caption className="sr-only">Sample daily order rates and cumulative incremental revenue</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Messaged order rate</th>
              <th scope="col">Holdout order rate</th>
              <th scope="col">Cumulative incremental</th>
            </tr>
          </thead>
          <tbody>
            {DAILY.map((d, i) => (
              <tr key={d.day}>
                <th scope="row">{d.day}</th>
                <td>{d.messaged.toFixed(2)} %</td>
                <td>{d.holdout.toFixed(2)} %</td>
                <td>{rupees(CUMULATIVE[i]!.value)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Day 30</th>
              <td colSpan={3}>
                {rupees(last.value)}, 95 % range {rupees(last.lo)} to {rupees(last.hi)}
              </td>
            </tr>
          </tfoot>
        </table>
      </details>
    </section>
  );
}
