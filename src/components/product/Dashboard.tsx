"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { COD, CUMULATIVE, DAILY, FAILURES, FLOWS, FUNNEL, HEALTH } from "@/data/dashboard";
import { count, rupees } from "@/lib/economics";
import styles from "./Dashboard.module.css";

const W = 560;
const H = 220;
const PAD = { l: 40, r: 76, t: 14, b: 26 };

const useInView = <T extends Element>() => {
  const ref = useRef<T>(null);
  const [inView, set] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (set(true), io.disconnect()), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
};

/** Two series on one axis, with a crosshair and a tooltip. */
function RateChart() {
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const max = 6;
  const x = (d: number) => PAD.l + ((d - 1) / 29) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const line = (key: "messaged" | "holdout") => DAILY.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(p[key]).toFixed(1)}`).join("");
  const last = DAILY[DAILY.length - 1];

  const move = (e: PointerEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const d = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * 29) + 1;
    setHover(Math.max(1, Math.min(30, d)));
  };
  const h = hover ? DAILY[hover - 1] : null;

  return (
    <div className={styles.chartWrap}>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className={styles.chart}
        onPointerMove={move}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Daily order rate over 30 days: messaged shoppers around 4 percent, holdout around 1.6 percent. Sample data."
      >
        {[0, 2, 4, 6].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className={styles.grid} />
            <text x={PAD.l - 8} y={y(v) + 3} className={styles.tick} textAnchor="end">
              {v}%
            </text>
          </g>
        ))}
        {[1, 10, 20, 30].map((d) => (
          <text key={d} x={x(d)} y={H - 6} className={styles.tick} textAnchor="middle">
            Day {d}
          </text>
        ))}
        <path d={line("holdout")} className={styles.line} data-s="2" pathLength={1} />
        <path d={line("messaged")} className={styles.line} data-s="1" pathLength={1} />
        <text x={x(30) + 8} y={y(last.messaged) + 4} className={styles.endLabel}>
          Messaged
        </text>
        <text x={x(30) + 8} y={y(last.holdout) + 4} className={styles.endLabel}>
          Holdout
        </text>
        {h ? (
          <g>
            <line x1={x(h.day)} x2={x(h.day)} y1={PAD.t} y2={H - PAD.b} className={styles.cross} />
            <circle cx={x(h.day)} cy={y(h.messaged)} r={4} className={styles.dot} data-s="1" />
            <circle cx={x(h.day)} cy={y(h.holdout)} r={4} className={styles.dot} data-s="2" />
          </g>
        ) : null}
        <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} fill="transparent" />
      </svg>
      {h ? (
        <div className={styles.tooltip} style={{ left: `${(x(h.day) / W) * 100}%` }}>
          <strong>Day {h.day}</strong>
          <span>
            <i data-s="1" /> Messaged {h.messaged.toFixed(1)}%
          </span>
          <span>
            <i data-s="2" /> Holdout {h.holdout.toFixed(1)}%
          </span>
          <span>Difference {(h.messaged - h.holdout).toFixed(1)} pts</span>
        </div>
      ) : null}
    </div>
  );
}

/** Cumulative incremental revenue inside its 95 % band. */
function CumulativeChart() {
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const max = Math.max(...CUMULATIVE.map((p) => p.hi)) * 1.05;
  const min = Math.min(0, ...CUMULATIVE.map((p) => p.lo));
  const x = (d: number) => PAD.l + ((d - 1) / 29) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);
  const band =
    CUMULATIVE.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(p.hi).toFixed(1)}`).join("") +
    CUMULATIVE.slice()
      .reverse()
      .map((p) => `L${x(p.day).toFixed(1)} ${y(p.lo).toFixed(1)}`)
      .join("") +
    "Z";
  const line = CUMULATIVE.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(p.value).toFixed(1)}`).join("");
  const last = CUMULATIVE[CUMULATIVE.length - 1];
  const h = hover ? CUMULATIVE[hover - 1] : null;
  const ticks = [0, 40000, 80000].filter((t) => t <= max);

  return (
    <div className={styles.chartWrap}>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className={styles.chart}
        onPointerMove={(e) => {
          const r = svg.current!.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(1, Math.min(30, Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * 29) + 1)));
        }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Cumulative incremental revenue reaches ${rupees(last.value)} by day 30, 95 percent range ${rupees(last.lo)} to ${rupees(last.hi)}. Sample data.`}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className={styles.grid} />
            <text x={PAD.l - 8} y={y(v) + 3} className={styles.tick} textAnchor="end">
              {v === 0 ? "₹0" : `₹${v / 1000}k`}
            </text>
          </g>
        ))}
        {[1, 10, 20, 30].map((d) => (
          <text key={d} x={x(d)} y={H - 6} className={styles.tick} textAnchor="middle">
            Day {d}
          </text>
        ))}
        <path d={band} className={styles.band} />
        <path d={line} className={styles.line} data-s="1" pathLength={1} />
        <text x={x(30) + 8} y={y(last.value) + 4} className={styles.endLabel}>
          {rupees(last.value)}
        </text>
        {h ? (
          <g>
            <line x1={x(h.day)} x2={x(h.day)} y1={PAD.t} y2={H - PAD.b} className={styles.cross} />
            <circle cx={x(h.day)} cy={y(h.value)} r={4} className={styles.dot} data-s="1" />
          </g>
        ) : null}
        <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} fill="transparent" />
      </svg>
      {h ? (
        <div className={styles.tooltip} style={{ left: `${(x(h.day) / W) * 100}%` }}>
          <strong>Day {h.day}</strong>
          <span>Incremental {rupees(h.value)}</span>
          <span>
            Range {rupees(h.lo)} to {rupees(h.hi)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function Dashboard() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const top = FUNNEL[0].value;
  const maxFail = Math.max(...FAILURES.map((f) => f.count));

  return (
    <section className={styles.section} aria-labelledby="dash-title">
      <div className={styles.intro}>
        <p className={styles.flag}>Sample data. Not a client, not a pilot, not a result.</p>
        <h2 id="dash-title" className={styles.title}>
          What a client opens every morning.
        </h2>
      </div>

      <div ref={ref} className={styles.console} data-in={inView ? "1" : "0"}>
        <div className={`${styles.panel} ${styles.funnel}`}>
          <h3 className={styles.panelTitle}>Live funnel, last 30 days</h3>
          <ol className={styles.bars}>
            {FUNNEL.map((f, i) => (
              <li key={f.step} style={{ "--w": `${(f.value / top) * 100}%`, "--i": i } as React.CSSProperties}>
                <span className={styles.barLabel}>{f.step}</span>
                <span className={styles.barTrack}>
                  <span className={styles.bar} />
                </span>
                <span className={`${styles.barValue} t-num`}>
                  {count(f.value)}
                  {i > 0 ? <em>{((f.value / FUNNEL[i - 1].value) * 100).toFixed(0)}%</em> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className={`${styles.panel} ${styles.rate}`}>
          <h3 className={styles.panelTitle}>Order rate, messaged vs holdout</h3>
          <div className={styles.legend}>
            <span>
              <i data-s="1" /> Messaged
            </span>
            <span>
              <i data-s="2" /> Holdout, never messaged
            </span>
          </div>
          <RateChart />
        </div>

        <div className={`${styles.panel} ${styles.cumulative}`}>
          <h3 className={styles.panelTitle}>Incremental revenue, with its 95% range</h3>
          <CumulativeChart />
        </div>

        <div className={`${styles.panel} ${styles.flows}`}>
          <h3 className={styles.panelTitle}>Per-flow performance</h3>
          <div className={styles.tableScroll} data-lenis-prevent>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Flow</th>
                  <th scope="col">Sent</th>
                  <th scope="col">Delivered</th>
                  <th scope="col">Read</th>
                  <th scope="col">Clicked</th>
                  <th scope="col">Ordered</th>
                  <th scope="col">Opted out</th>
                </tr>
              </thead>
              <tbody>
                {FLOWS.map((f) => (
                  <tr key={f.flow}>
                    <th scope="row">{f.flow}</th>
                    <td>{count(f.sent)}</td>
                    <td>{count(f.delivered)}</td>
                    <td>
                      <span className={styles.inline}>
                        <span style={{ "--w": `${(f.read / f.sent) * 100}%` } as React.CSSProperties} />
                      </span>
                      {count(f.read)}
                    </td>
                    <td>{count(f.clicked)}</td>
                    <td>{f.flow === "COD confirmation" ? "n/a" : count(f.ordered)}</td>
                    <td>{count(f.optedOut)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${styles.panel} ${styles.failures}`}>
          <h3 className={styles.panelTitle}>Why payments failed, and how many came back</h3>
          <ol className={styles.bars}>
            {FAILURES.map((f, i) => (
              <li key={f.reason} style={{ "--w": `${(f.count / maxFail) * 100}%`, "--i": i } as React.CSSProperties}>
                <span className={styles.barLabel}>{f.reason}</span>
                <span className={styles.barTrack}>
                  <span className={styles.bar} />
                </span>
                <span className={`${styles.barValue} t-num`}>
                  {count(f.count)}
                  <em>{Math.round(f.recovered * 100)}% recovered</em>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className={`${styles.panel} ${styles.tiles}`}>
          <h3 className={styles.panelTitle}>COD, quality and consent</h3>
          <dl className={styles.stats}>
            <div>
              <dt>COD confirmed before dispatch</dt>
              <dd>{Math.round(COD.confirmed * 100)}%</dd>
            </div>
            <div>
              <dt>Return to origin</dt>
              <dd>
                {Math.round(COD.rtoBefore * 100)}% <span className={styles.to}>to</span> {Math.round(COD.rtoAfter * 100)}%
              </dd>
            </div>
            <div>
              <dt>Quality rating</dt>
              <dd className={styles.status} data-status={HEALTH.quality}>
                <i aria-hidden />
                {HEALTH.quality}
              </dd>
            </div>
            <div>
              <dt>Message spend</dt>
              <dd>{rupees(HEALTH.spend)}</dd>
            </div>
            <div>
              <dt>Opt-ins collected</dt>
              <dd>{count(HEALTH.optIns)}</dd>
            </div>
            <div>
              <dt>Opt-outs</dt>
              <dd>{count(HEALTH.optOuts)}</dd>
            </div>
          </dl>
          <p className={styles.fine}>Messaging limit: {HEALTH.limit.toLowerCase()}.</p>
        </div>
      </div>

      <details className={styles.dataTable}>
        <summary>Chart data as a table</summary>
        <table className={styles.table}>
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
                <td>{d.messaged.toFixed(2)}%</td>
                <td>{d.holdout.toFixed(2)}%</td>
                <td>{rupees(CUMULATIVE[i].value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
