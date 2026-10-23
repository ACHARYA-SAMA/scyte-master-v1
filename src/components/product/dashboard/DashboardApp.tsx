"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { COD, CUMULATIVE, DAILY, FAILURES, FLOWS, FUNNEL, HEALTH } from "@/data/dashboard";
import { count, rupees } from "@/lib/economics";
import { Odometer } from "@/components/kit/Odometer";
import { SplitFlapBoard } from "@/components/kit/SplitFlapBoard";
import styles from "./dashboardApp.module.css";

/** The app's sections, in scroll order; the outer page's spy list reads these too. */
export const DASH_SECTIONS = [
  { id: "dash-overview", label: "Overview" },
  { id: "dash-funnel", label: "Funnel" },
  { id: "dash-flows", label: "Flows" },
  { id: "dash-holdout", label: "Holdout" },
  { id: "dash-payments", label: "Payments" },
  { id: "dash-cod", label: "COD and consent" },
] as const;

/* Series colours, from the dataviz check on Ground deep (see docs/palette.md):
   messaged ochre, holdout green; the four flows step from Lumen down to green. */
const FLOW_TONE = ["#f9dc7d", "#c2b897", "#af9034", "#5d8c62"];

const useInView = <T extends Element>() => {
  const ref = useRef<T>(null);
  const [on, set] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && (set(true), io.disconnect()), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, on] as const;
};

function Section({ id, title, note, children, className }: { id: string; title: string; note?: string; children: ReactNode; className?: string }) {
  const [ref, on] = useInView<HTMLElement>();
  return (
    <section ref={ref} id={id} className={`${styles.section} ${className ?? ""}`} data-in={on ? "1" : "0"} aria-labelledby={`${id}-t`}>
      <header className={styles.sectionHead}>
        <h3 id={`${id}-t`}>{title}</h3>
        {note ? <p>{note}</p> : null}
      </header>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ KPIs */
function Spark({ values, tone }: { values: number[]; tone: string }) {
  const w = 160;
  const h = 36;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const d = values.map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * w).toFixed(1)} ${(h - 3 - ((v - lo) / (hi - lo || 1)) * (h - 6)).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.spark} aria-hidden>
      <path d={d} style={{ stroke: tone }} pathLength={1} />
    </svg>
  );
}

/** A stacked strip of each flow's share, where a card has no daily series to draw. */
function Split({ values }: { values: number[] }) {
  const total = values.reduce((x, y) => x + y, 0) || 1;
  return (
    <span className={styles.split} aria-hidden>
      {values.map((v, i) => (v > 0 ? <span key={i} style={{ flexGrow: v / total, background: FLOW_TONE[i] }} /> : null))}
    </span>
  );
}

function Kpis() {
  const last = CUMULATIVE[CUMULATIVE.length - 1]!;
  const recovered = FLOWS.reduce((a, f) => a + f.ordered, 0);
  const sent = FLOWS.reduce((a, f) => a + f.sent, 0);
  const cards: { label: string; value: number; prefix?: string; note: string; art: ReactNode }[] = [
    { label: "Incremental revenue", value: last.value, prefix: "₹", note: `95 % range ${rupees(last.lo)} to ${rupees(last.hi)}`, art: <Spark values={CUMULATIVE.map((c) => c.value)} tone="#f9dc7d" /> },
    { label: "Orders recovered", value: recovered, note: "payment, checkout and cart flows", art: <Split values={FLOWS.map((f) => (f.flow === "COD confirmation" ? 0 : f.ordered))} /> },
    { label: "Messages sent", value: sent, note: `${rupees(HEALTH.spend)} message spend`, art: <Split values={FLOWS.map((f) => f.sent)} /> },
    { label: "Opt-outs", value: HEALTH.optOuts, note: `${count(HEALTH.optIns)} opt-ins collected`, art: <Split values={FLOWS.map((f) => f.optedOut)} /> },
  ];
  return (
    <div className={styles.kpis}>
      {cards.map((c, i) => (
        <div key={c.label} className={styles.kpi}>
          <span className={styles.kpiLabel}>{c.label}</span>
          <Odometer value={c.value} prefix={c.prefix} className={styles.kpiValue} breathe={i === 0} />
          <span className={styles.kpiNote}>{c.note}</span>
          {c.art}
        </div>
      ))}
      <p className={styles.kpiKey}>
        {FLOWS.map((f, i) => (
          <span key={f.flow}>
            <i style={{ background: FLOW_TONE[i] }} /> {f.flow}
          </span>
        ))}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ the glass funnel */
function GlassFunnel() {
  const W = 560;
  const band = 50;
  const gap = 12;
  const top = FUNNEL[0]!.value;
  const half = (v: number) => Math.max(9, (v / top) * (W / 2 - 10));
  const cx = W / 2;
  const H = FUNNEL.length * (band + gap);
  const [hot, setHot] = useState<number | null>(null);
  return (
    <div className={styles.funnelWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.funnel} role="img" aria-label="Sample funnel over 30 days: 48,200 sessions down to 2,000 orders. Widths to scale.">
        <defs>
          <linearGradient id="glassG" x1="0" x2="1">
            <stop offset="0" stopColor="#e6d5b8" stopOpacity="0.16" />
            <stop offset="0.18" stopColor="#e6d5b8" stopOpacity="0.04" />
            <stop offset="0.8" stopColor="#e6d5b8" stopOpacity="0.02" />
            <stop offset="1" stopColor="#e6d5b8" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="liquidG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f9dc7d" stopOpacity="0.9" />
            <stop offset="1" stopColor="#af9034" stopOpacity="0.75" />
          </linearGradient>
        </defs>
        {FUNNEL.map((f, i) => {
          const next = FUNNEL[i + 1]?.value ?? f.value * 0.86;
          const y = i * (band + gap);
          const a = half(f.value);
          const b = half(next);
          const shape = `M${cx - a} ${y} L${cx + a} ${y} L${cx + b} ${y + band} L${cx - b} ${y + band} Z`;
          return (
            <g key={f.step} className={styles.stage} style={{ "--i": i } as CSSProperties} data-hot={hot === i ? "1" : undefined} onPointerEnter={() => setHot(i)} onPointerLeave={() => setHot(null)}>
              <clipPath id={`fc${i}`}>
                <path d={shape} />
              </clipPath>
              {/* the liquid rises in each glass, a beat after the one above */}
              <rect x={0} y={y} width={W} height={band} clipPath={`url(#fc${i})`} className={styles.liquid} fill="url(#liquidG)" />
              <path d={shape} fill="url(#glassG)" className={styles.glass} />
              <ellipse cx={cx} cy={y} rx={a} ry={4} className={styles.rim} />
              <line x1={cx - a + 6} y1={y + 6} x2={cx - b + 5} y2={y + band - 6} className={styles.shine} />
              {i < FUNNEL.length - 1 ? <circle cx={cx} cy={y + band + gap / 2} r={2.2} className={styles.drip} /> : null}
            </g>
          );
        })}
      </svg>
      <ol className={styles.steps}>
        {FUNNEL.map((f, i) => (
          <li key={f.step} data-hot={hot === i ? "1" : undefined} onPointerEnter={() => setHot(i)} onPointerLeave={() => setHot(null)}>
            <span>{f.step}</span>
            <strong>{count(f.value)}</strong>
            <em>{i ? `${((f.value / FUNNEL[i - 1]!.value) * 100).toFixed(0)} % of the step above` : "everyone who arrived"}</em>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ flows: board and sankey */
const STAGES = ["sent", "delivered", "read", "clicked", "ordered"] as const;
const STAGE_LABEL: Record<(typeof STAGES)[number], string> = { sent: "Sent", delivered: "Delivered", read: "Read", clicked: "Tapped", ordered: "Ordered" };

function FlowBoard() {
  const pad = (s: string | number, n: number, left = false) => {
    const t = String(s);
    return left ? t.padEnd(n).slice(0, n) : t.padStart(n).slice(-n);
  };
  const short = (f: string) => f.replace("Payment-failed rescue", "PAYMENT RESCUE").replace("COD confirmation", "COD CONFIRM").replace("Checkout recovery", "CHECKOUT").replace("Cart recovery", "CART");
  const rows = [
    { text: `${pad("FLOW", 15, true)}${pad("SENT", 6)}${pad("READ", 6)}${pad("TAP", 6)}${pad("ORDER", 6)}${pad("OUT", 4)}`, tone: "muted" as const },
    ...FLOWS.map((f, i) => ({
      text: `${pad(short(f.flow), 15, true)}${pad(f.sent, 6)}${pad(f.read, 6)}${pad(f.clicked, 6)}${pad(f.flow === "COD confirmation" ? "-" : f.ordered, 6)}${pad(f.optedOut, 4)}`,
      tone: i === 0 ? ("lumen" as const) : ("cream" as const),
    })),
  ];
  return <SplitFlapBoard label="Per-flow performance, sample data" rows={rows} columns={43} size="m" rowStagger={110} className={styles.board} />;
}

function Sankey() {
  const W = 1000;
  const H = 300;
  const colX = (i: number) => 120 + i * ((W - 220) / (STAGES.length - 1));
  const total = FLOWS.reduce((a, f) => a + f.sent, 0);
  const k = (H - 70) / total;
  const [hot, setHot] = useState<number | null>(null);
  // each flow's band in each column, stacked top-down with a gap
  const GAP = 8;
  const pos = STAGES.map((s) => {
    let y = 34;
    return FLOWS.map((f) => {
      const v = f.flow === "COD confirmation" && s === "ordered" ? 0 : f[s];
      const h = v * k;
      const out = { y, h, v };
      y += h + GAP;
      return out;
    });
  });
  // the last column's labels, spread so the small ends never print over each other
  const ends: number[] = [];
  pos[STAGES.length - 1]!.forEach((p, i) => ends.push(Math.max(p.y + p.h / 2, (ends[i - 1] ?? -99) + 18)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.sankey} role="img" aria-label="Sample data: how each flow's messages narrow from sent to ordered.">
      {STAGES.map((s, i) => (
        <text key={s} x={colX(i)} y={18} className={styles.axis} textAnchor="middle">
          {STAGE_LABEL[s]}
        </text>
      ))}
      {FLOWS.map((f, fi) => (
        <g key={f.flow} className={styles.ribbon} data-dim={hot !== null && hot !== fi ? "1" : undefined} onPointerEnter={() => setHot(fi)} onPointerLeave={() => setHot(null)}>
          {STAGES.slice(0, -1).map((_, i) => {
            const a = pos[i]![fi]!;
            const b = pos[i + 1]![fi]!;
            const x0 = colX(i) + 6;
            const x1 = colX(i + 1) - 6;
            const m = (x0 + x1) / 2;
            const d = `M${x0} ${a.y} C${m} ${a.y} ${m} ${b.y} ${x1} ${b.y} L${x1} ${b.y + b.h} C${m} ${b.y + b.h} ${m} ${a.y + a.h} ${x0} ${a.y + a.h} Z`;
            return <path key={i} d={d} style={{ fill: FLOW_TONE[fi], "--i": i } as CSSProperties} />;
          })}
          {STAGES.map((_, i) => {
            const p = pos[i]![fi]!;
            return p.h > 0 ? <rect key={i} x={colX(i) - 6} y={p.y} width={12} height={Math.max(1.5, p.h)} style={{ fill: FLOW_TONE[fi] }} className={styles.node} /> : null;
          })}
          <text x={colX(0) - 14} y={pos[0]![fi]!.y + pos[0]![fi]!.h / 2 + 4} textAnchor="end" className={styles.flowLabel}>
            {f.flow}
          </text>
          <text x={colX(STAGES.length - 1) + 14} y={ends[fi]! + 4} className={styles.flowValue}>
            {f.flow === "COD confirmation" ? `${count(f.clicked)} confirmed` : `${count(f.ordered)} orders`}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ holdout charts */
const CW = 520;
const CH = 230;
const PAD = { l: 44, r: 82, t: 14, b: 28 };

function RateChart() {
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const max = 6;
  const x = (d: number) => PAD.l + ((d - 1) / 29) * (CW - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (CH - PAD.t - PAD.b);
  const line = (key: "messaged" | "holdout") => DAILY.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(p[key]).toFixed(1)}`).join("");
  const last = DAILY[DAILY.length - 1]!;
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * CW;
    setHover(Math.max(1, Math.min(30, Math.round(((px - PAD.l) / (CW - PAD.l - PAD.r)) * 29) + 1)));
  };
  const h = hover ? DAILY[hover - 1] : null;
  return (
    <div className={styles.chartWrap}>
      <svg ref={svg} viewBox={`0 0 ${CW} ${CH}`} className={styles.chart} onPointerMove={move} onPointerLeave={() => setHover(null)} role="img" aria-label="Sample daily order rate: messaged near 4 percent, holdout near 1.6 percent.">
        {[0, 2, 4, 6].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={CW - PAD.r} y1={y(v)} y2={y(v)} className={styles.grid} />
            <text x={PAD.l - 8} y={y(v) + 4} className={styles.tick} textAnchor="end">
              {v} %
            </text>
          </g>
        ))}
        {[1, 10, 20, 30].map((d) => (
          <text key={d} x={x(d)} y={CH - 6} className={styles.tick} textAnchor="middle">
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
            <line x1={x(h.day)} x2={x(h.day)} y1={PAD.t} y2={CH - PAD.b} className={styles.cross} />
            <circle cx={x(h.day)} cy={y(h.messaged)} r={4.5} className={styles.dot} data-s="1" />
            <circle cx={x(h.day)} cy={y(h.holdout)} r={4.5} className={styles.dot} data-s="2" />
          </g>
        ) : null}
        <rect x={PAD.l} y={PAD.t} width={CW - PAD.l - PAD.r} height={CH - PAD.t - PAD.b} fill="transparent" />
      </svg>
      {h ? (
        <div className={styles.tooltip} style={{ left: `${(x(h.day) / CW) * 100}%` }}>
          <strong>Day {h.day}</strong>
          <span>
            <i data-s="1" /> Messaged {h.messaged.toFixed(1)} %
          </span>
          <span>
            <i data-s="2" /> Holdout {h.holdout.toFixed(1)} %
          </span>
        </div>
      ) : null}
    </div>
  );
}

function CumulativeChart() {
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const max = Math.max(...CUMULATIVE.map((p) => p.hi)) * 1.05;
  const min = Math.min(0, ...CUMULATIVE.map((p) => p.lo));
  const x = (d: number) => PAD.l + ((d - 1) / 29) * (CW - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (CH - PAD.t - PAD.b);
  const band =
    CUMULATIVE.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(p.hi).toFixed(1)}`).join("") +
    CUMULATIVE.slice()
      .reverse()
      .map((p) => `L${x(p.day).toFixed(1)} ${y(p.lo).toFixed(1)}`)
      .join("") +
    "Z";
  const line = CUMULATIVE.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(p.value).toFixed(1)}`).join("");
  const last = CUMULATIVE[CUMULATIVE.length - 1]!;
  const h = hover ? CUMULATIVE[hover - 1] : null;
  return (
    <div className={styles.chartWrap}>
      <svg
        ref={svg}
        viewBox={`0 0 ${CW} ${CH}`}
        className={styles.chart}
        onPointerMove={(e) => {
          const r = svg.current!.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * CW;
          setHover(Math.max(1, Math.min(30, Math.round(((px - PAD.l) / (CW - PAD.l - PAD.r)) * 29) + 1)));
        }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Sample cumulative incremental revenue: ${rupees(last.value)} by day 30, range ${rupees(last.lo)} to ${rupees(last.hi)}.`}
      >
        {[0, 40000, 80000]
          .filter((t) => t <= max)
          .map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={CW - PAD.r} y1={y(v)} y2={y(v)} className={styles.grid} />
              <text x={PAD.l - 8} y={y(v) + 4} className={styles.tick} textAnchor="end">
                {v === 0 ? "₹0" : `₹${v / 1000}k`}
              </text>
            </g>
          ))}
        {[1, 10, 20, 30].map((d) => (
          <text key={d} x={x(d)} y={CH - 6} className={styles.tick} textAnchor="middle">
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
            <line x1={x(h.day)} x2={x(h.day)} y1={PAD.t} y2={CH - PAD.b} className={styles.cross} />
            <circle cx={x(h.day)} cy={y(h.value)} r={4.5} className={styles.dot} data-s="1" />
          </g>
        ) : null}
        <rect x={PAD.l} y={PAD.t} width={CW - PAD.l - PAD.r} height={CH - PAD.t - PAD.b} fill="transparent" />
      </svg>
      {h ? (
        <div className={styles.tooltip} style={{ left: `${(x(h.day) / CW) * 100}%` }}>
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

/* ------------------------------------------------------------------ payments radar */
function Radar() {
  const R = 120;
  const c = 160;
  const maxC = Math.max(...FAILURES.map((f) => f.count));
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / FAILURES.length) * Math.PI * 2;
    return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v] as const;
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).map((n) => n.toFixed(1)).join(",")).join(" ");
  const failed = FAILURES.map((f) => f.count / maxC);
  const back = FAILURES.map((f) => (f.count * f.recovered) / maxC);
  return (
    <svg viewBox="-80 -14 480 348" className={styles.radar} role="img" aria-label="Sample payment failures by reason, and how many came back.">
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} points={poly(FAILURES.map(() => r))} className={styles.web} />
      ))}
      {FAILURES.map((f, i) => {
        const [x, y] = pt(i, 1);
        const [lx, ly] = pt(i, 1.17);
        return (
          <g key={f.reason}>
            <line x1={c} y1={c} x2={x} y2={y} className={styles.web} />
            <text x={lx} y={ly + 4} textAnchor={Math.abs(lx - c) < 4 ? "middle" : lx > c ? "start" : "end"} className={styles.axis}>
              {f.reason}
            </text>
          </g>
        );
      })}
      <polygon points={poly(failed)} className={styles.failed} />
      <polygon points={poly(back)} className={styles.back} />
      {back.map((v, i) => {
        const [x, y] = pt(i, v);
        return <circle key={i} cx={x} cy={y} r={3.5} className={styles.backDot} />;
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ COD gauge */
function Gauge({ value, label }: { value: number; label: string }) {
  const R = 110;
  const ang = -90 + value * 180;
  const arc = (from: number, to: number) => {
    const p = (d: number) => [130 + Math.cos(((d - 180) * Math.PI) / 180) * R, 130 + Math.sin(((d - 180) * Math.PI) / 180) * R] as const;
    const [x0, y0] = p(from * 180);
    const [x1, y1] = p(to * 180);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  return (
    <svg viewBox="0 0 260 150" className={styles.gauge} role="img" aria-label={`${label}: ${Math.round(value * 100)} percent`}>
      <path d={arc(0, 1)} className={styles.gaugeTrack} />
      <path d={arc(0, value)} className={styles.gaugeFill} pathLength={1} />
      {Array.from({ length: 11 }, (_, i) => {
        const a = ((i / 10) * 180 - 180) * (Math.PI / 180);
        return <line key={i} x1={130 + Math.cos(a) * (R - 16)} y1={130 + Math.sin(a) * (R - 16)} x2={130 + Math.cos(a) * (R - (i % 5 ? 22 : 28))} y2={130 + Math.sin(a) * (R - (i % 5 ? 22 : 28))} className={styles.gaugeTick} />;
      })}
      <g className={styles.needle} style={{ "--a": `${ang}deg` } as CSSProperties}>
        <line x1={130} y1={130} x2={130} y2={44} />
        <circle cx={130} cy={130} r={7} />
      </g>
      <text x={130} y={112} textAnchor="middle" className={styles.gaugeValue}>
        {Math.round(value * 100)} %
      </text>
    </svg>
  );
}

/**
 * The client dashboard, as a real app: a sidebar, a top bar and six sections of
 * instruments on sample data. It is laid out at the laptop's logical width, on one
 * explicit grid, so no panel can float free of it.
 */
export function DashboardApp({ active }: { active: string }) {
  return (
    <div className={styles.shell}>
    <div className={styles.app}>
      <aside className={styles.side}>
        <p className={styles.store}>
          <span className={styles.storeMark} aria-hidden />
          Sample store
        </p>
        <nav aria-label="Dashboard sections">
          <ul>
            {DASH_SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} data-on={active === s.id ? "1" : undefined} tabIndex={-1}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className={styles.sideNote}>Sample data. Not a client, not a pilot, not a result.</p>
      </aside>
      <div className={styles.main}>
        <header className={styles.top}>
          <h3 className={styles.pageTitle}>Overview</h3>
          <span className={styles.chip}>Last 30 days</span>
          <span className={styles.chip}>Holdout 10 %</span>
          <span className={styles.chip} data-tone="quiet">
            Quality {HEALTH.quality.toLowerCase()}
          </span>
        </header>
        <Section id="dash-overview" title="This month" note="Incremental means above the holdout, never all orders.">
          <Kpis />
        </Section>
        <Section id="dash-funnel" title="Sample funnel, last 30 days" note="Widths to scale. Point at a glass for its step.">
          <GlassFunnel />
        </Section>
        <Section id="dash-flows" title="Per-flow performance" note="Each flow's messages, narrowing from sent to ordered.">
          <FlowBoard />
          <Sankey />
        </Section>
        <Section id="dash-holdout" title="Messaged against the holdout" note="The gap is the proof. The band is how sure it is.">
          <div className={styles.pair}>
            <figure className={styles.figure}>
              <figcaption>
                Order rate <span className={styles.key} data-s="1" /> messaged <span className={styles.key} data-s="2" /> holdout, never messaged
              </figcaption>
              <RateChart />
            </figure>
            <figure className={styles.figure}>
              <figcaption>Incremental revenue, with its 95 % range</figcaption>
              <CumulativeChart />
            </figure>
          </div>
        </Section>
        <Section id="dash-payments" title="Why payments failed, and how many came back" note="Outline: failures. Filled: recovered by the rescue flow.">
          <div className={styles.pay}>
            <Radar />
            <ol className={styles.reasons}>
              {FAILURES.map((f) => (
                <li key={f.reason} style={{ "--w": `${f.recovered * 100}%` } as CSSProperties}>
                  <span>{f.reason}</span>
                  <strong>{count(f.count)}</strong>
                  <span className={styles.reasonBar} aria-hidden>
                    <span />
                  </span>
                  <em>{Math.round(f.recovered * 100)} % came back</em>
                </li>
              ))}
            </ol>
          </div>
        </Section>
        <Section id="dash-cod" title="Cash on delivery, quality and consent">
          <div className={styles.cod}>
            <figure className={styles.figure}>
              <figcaption>COD confirmed before dispatch</figcaption>
              <Gauge value={COD.confirmed} label="COD orders confirmed before dispatch" />
            </figure>
            <figure className={styles.figure}>
              <figcaption>Return to origin</figcaption>
              <div className={styles.rto}>
                <div style={{ "--h": `${COD.rtoBefore * 300}%` } as CSSProperties}>
                  <span />
                  <strong>{Math.round(COD.rtoBefore * 100)} %</strong>
                  <em>before</em>
                </div>
                <div style={{ "--h": `${COD.rtoAfter * 300}%` } as CSSProperties} data-after>
                  <span />
                  <strong>{Math.round(COD.rtoAfter * 100)} %</strong>
                  <em>after</em>
                </div>
              </div>
            </figure>
            <dl className={styles.health}>
              <div>
                <dt>Quality rating</dt>
                <dd>
                  <i aria-hidden /> {HEALTH.quality}
                </dd>
              </div>
              <div>
                <dt>Message spend</dt>
                <dd>{rupees(HEALTH.spend)}</dd>
              </div>
              <div>
                <dt>Opt-ins</dt>
                <dd>{count(HEALTH.optIns)}</dd>
              </div>
              <div>
                <dt>Opt-outs</dt>
                <dd>{count(HEALTH.optOuts)}</dd>
              </div>
              <div className={styles.wide}>
                <dt>Messaging limit</dt>
                <dd className={styles.small}>{HEALTH.limit}</dd>
              </div>
            </dl>
          </div>
        </Section>
        <footer className={styles.end}>End of the sample dashboard. A pilot shows your store&rsquo;s own numbers here.</footer>
      </div>
    </div>
    </div>
  );
}

/** The diagonal band across the screen's corner: on every frame, never scrolled away. */
export function SampleRibbon() {
  return (
    <div className={styles.ribbon} aria-hidden>
      <span>Sample data</span>
    </div>
  );
}
