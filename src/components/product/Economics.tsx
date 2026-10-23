"use client";

import { useMemo, useRef, useState } from "react";
import { REPORT_CASE, count, model, pct, rupees, type Inputs } from "@/lib/economics";
import { RotaryKnob } from "@/components/kit/RotaryKnob";
import { LeverSwitch } from "@/components/kit/LeverSwitch";
import { ToggleSwitch } from "@/components/kit/ToggleSwitch";
import { ReceiptPrinter, type ReceiptLine } from "@/components/kit/ReceiptPrinter";
import { useAttract } from "@/lib/idle";
import styles from "./Economics.module.css";

type Field = {
  key: keyof Inputs;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
};

/** Every input of the model, as a knob on the console. Margin has its own lever. */
const KNOBS: Field[] = [
  { key: "orders", label: "Orders a month", min: 200, max: 20000, step: 100, format: count },
  { key: "aov", label: "Order value", min: 300, max: 8000, step: 50, format: rupees },
  { key: "carts", label: "Abandoned carts", min: 500, max: 50000, step: 100, format: count },
  { key: "messageablePct", label: "With consent", min: 5, max: 80, step: 1, format: (v) => `${v} %` },
  { key: "messagesPerCart", label: "Messages a cart", min: 1, max: 3, step: 0.1, format: (v) => v.toFixed(1) },
  { key: "messageCost", label: "Cost a message", min: 0.1, max: 2, step: 0.01, format: (v) => `₹${v.toFixed(2)}` },
  { key: "orderRatePct", label: "Who order", min: 0.5, max: 12, step: 0.1, format: (v) => `${v.toFixed(1)} %` },
  { key: "incrementalPct", label: "Incremental", min: 0, max: 100, step: 1, format: (v) => `${v} %` },
  { key: "fee", label: "Software fee", min: 0, max: 100000, step: 500, format: rupees },
  { key: "holdoutPct", label: "Holdout", min: 2, max: 50, step: 1, format: (v) => `${v} %` },
];

const MARGINS = [20, 35, 50, 65, 80, 100];

/** The result on a dial: zero at noon, the 95 % range as a lit arc, the needle on a spring. */
function Gauge({ value, lo, hi }: { value: number; lo: number; hi: number }) {
  const finite = Number.isFinite(lo) && Number.isFinite(hi);
  const reach = Math.max(20000, Math.abs(value) * 1.4, finite ? Math.max(Math.abs(lo), Math.abs(hi)) * 1.1 : 0);
  const step = 10 ** Math.floor(Math.log10(reach)) * (reach / 10 ** Math.floor(Math.log10(reach)) > 5 ? 2 : 1);
  const max = Math.ceil(reach / step) * step;
  const ang = (v: number) => (Math.max(-max, Math.min(max, v)) / max) * 90;
  const R = 150;
  const pt = (a: number, r: number) => [200 + Math.sin((a * Math.PI) / 180) * r, 190 - Math.cos((a * Math.PI) / 180) * r] as const;
  const arc = (a0: number, a1: number, r: number) => {
    const [x0, y0] = pt(a0, r);
    const [x1, y1] = pt(a1, r);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  const ticks = Array.from({ length: 21 }, (_, i) => -90 + i * 9);
  return (
    <svg viewBox="0 0 400 220" className={styles.gauge} role="img" aria-label={`Net a month ${rupees(value)}, 95 percent range ${rupees(lo)} to ${rupees(hi)}`}>
      <path d={arc(-90, 90, R)} className={styles.gTrack} />
      {finite ? <path d={arc(ang(Math.min(lo, hi)), ang(Math.max(lo, hi)), R)} className={styles.gRange} /> : null}
      {ticks.map((a, i) => {
        const [x0, y0] = pt(a, R - 16);
        const [x1, y1] = pt(a, R - (i % 5 ? 24 : 34));
        return <line key={a} x1={x0} y1={y0} x2={x1} y2={y1} className={styles.gTick} data-zero={a === 0 ? "1" : undefined} />;
      })}
      {[-max, -max / 2, 0, max / 2, max].map((v) => {
        const [x, y] = pt(ang(v), R - 50);
        return (
          <text key={v} x={x} y={y + 4} textAnchor="middle" className={styles.gLabel}>
            {v === 0 ? "₹0" : `${v < 0 ? "−" : ""}₹${Math.abs(v) >= 100000 ? `${Math.abs(v) / 100000}L` : `${Math.abs(v) / 1000}k`}`}
          </text>
        );
      })}
      <g className={styles.gNeedle} style={{ "--a": `${ang(value)}deg` } as React.CSSProperties}>
        <line x1={200} y1={190} x2={200} y2={56} />
        <circle cx={200} cy={190} r={9} />
      </g>
    </svg>
  );
}

/** Point estimate with its 95 % range, on an axis that always includes zero. */
function RangeBar({ value, lo, hi }: { value: number; lo: number; hi: number }) {
  const finite = Number.isFinite(lo) && Number.isFinite(hi);
  const min = Math.min(0, finite ? lo : value) * 1.15;
  const max = Math.max(0, finite ? hi : value) * 1.15 || 1;
  const x = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div className={styles.rangeBar} role="img" aria-label={`Estimate ${rupees(value)}, 95% range ${rupees(lo)} to ${rupees(hi)}`}>
      <div className={styles.axis}>
        <span className={styles.zero} style={{ left: `${x(0)}%` }}>
          <em>₹0</em>
        </span>
        {finite ? <span className={styles.band} style={{ left: `${x(lo)}%`, width: `${x(hi) - x(lo)}%` }} /> : null}
        <span className={styles.point} style={{ left: `${x(value)}%` }} />
      </div>
      <div className={styles.ends}>
        <span className="t-num">{rupees(lo)}</span>
        <span className="t-num">{rupees(hi)}</span>
      </div>
    </div>
  );
}

type Step = { label: string; value: number; kind: "total" | "less" | "result" };

/** Bars on one shared axis that includes zero, so a loss reads as a loss. */
function Waterfall({ steps }: { steps: Step[] }) {
  const spans: [number, number][] = [];
  let running = 0;
  for (const s of steps) {
    if (s.kind === "less") {
      spans.push([running - s.value, running]);
      running -= s.value;
    } else {
      spans.push([Math.min(0, s.value), Math.max(0, s.value)]);
      running = s.value;
    }
  }
  const min = Math.min(0, ...spans.map((sp) => sp[0]));
  const max = Math.max(1, ...spans.map((sp) => sp[1]));
  const x = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <ol className={styles.waterfall} style={{ "--zero": `${x(0)}%` } as React.CSSProperties}>
      {steps.map((s, i) => {
        const [a, b] = spans[i];
        return (
          <li key={s.label} data-kind={s.kind} data-negative={s.kind === "result" && s.value < 0 ? "1" : undefined}>
            <span className={styles.wLabel}>{s.label}</span>
            <span className={styles.wTrack}>
              <span className={styles.wBar} style={{ left: `${x(a)}%`, width: `${Math.max(0.6, x(b) - x(a))}%` }} />
            </span>
            <span className={`${styles.wValue} t-num`}>
              {s.kind === "less" ? `−${rupees(s.value)}` : rupees(s.value)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * P11, the control room: the business model's example brand on a console. A knob for
 * every input and a lever for margin; a mechanical switch between the honest view (on
 * margin) and the simple one (on revenue); the result on a dial with its 95 % range,
 * the waterfall that makes it, and a receipt printer that prints every number. The
 * full table stays in a disclosure, not open on the page.
 */
export function Economics() {
  const [inputs, setInputs] = useState<Inputs>(REPORT_CASE);
  const [view, setView] = useState<"margin" | "revenue">("margin");
  const [printId, setPrintId] = useState(0);
  const r = useMemo(() => model(inputs), [inputs]);
  const report = useMemo(() => model({ ...REPORT_CASE, holdoutPct: 0, marginPct: 100 }), []);
  const desk = useRef<HTMLDivElement>(null);

  const set = (key: keyof Inputs) => (v: number) => setInputs((s) => ({ ...s, [key]: v }));
  const net = view === "margin" ? r.netMargin : r.netRevenue;
  const lo = view === "margin" ? r.netMarginLo : r.netRevenueLo;
  const hi = view === "margin" ? r.netMarginHi : r.netRevenueHi;
  const marginStop = MARGINS.reduce((best, m, i) => (Math.abs(m - inputs.marginPct) < Math.abs(MARGINS[best]! - inputs.marginPct) ? i : best), 0);

  // until someone touches the console, it shows the margin lever doing its work
  useAttract(desk, () => setInputs((s) => ({ ...s, marginPct: MARGINS[(MARGINS.indexOf(s.marginPct) + 1) % MARGINS.length] ?? 50 })), 3400);

  const steps: Step[] =
    view === "margin"
      ? [
          { label: "Incremental revenue", value: r.incRevenue, kind: "total" },
          { label: "Kept as margin", value: r.incContribution, kind: "total" },
          { label: "Software fee", value: inputs.fee, kind: "less" },
          { label: "Message cost", value: r.messageSpend, kind: "less" },
          { label: "Net a month", value: r.netMargin, kind: "result" },
        ]
      : [
          { label: "Incremental revenue", value: r.incRevenue, kind: "total" },
          { label: "Software fee", value: inputs.fee, kind: "less" },
          { label: "Message cost", value: r.messageSpend, kind: "less" },
          { label: "Net a month", value: r.netRevenue, kind: "result" },
        ];

  const rows: [string, string][] = [
    ["Consented, messageable carts", count(r.messageable)],
    ["Holdout", count(r.held)],
    ["Messaged", count(r.messaged)],
    ["Messages sent", count(r.messages)],
    ["Message cost", rupees(r.messageSpend)],
    ["Order rate, messaged", pct(r.lift.p1)],
    ["Order rate, holdout (expected)", pct(r.lift.p0)],
    ["Lift, 95% range", `${pct(r.lift.lo, 2)} to ${pct(r.lift.hi, 2)}`],
    ["Gross recovered revenue", rupees(r.gross)],
    ["Incremental revenue", rupees(r.incRevenue)],
    ["Incremental contribution", rupees(r.incContribution)],
    ["Net on margin", rupees(r.netMargin)],
    ["Net on revenue", rupees(r.netRevenue)],
  ];
  const receipt: ReceiptLine[] = [
    { kind: "title", text: "Paper trail, illustrative" },
    ...KNOBS.map((k) => ({ kind: "row" as const, left: k.label, right: k.format(inputs[k.key]) })),
    { kind: "row", left: "Margin", right: `${inputs.marginPct} %` },
    { kind: "rule" },
    ...rows.map(([left, right]) => ({ kind: "row" as const, left, right })),
    { kind: "rule" },
    { kind: "total", left: view === "margin" ? "Net, on margin" : "Net, on revenue", right: rupees(net) },
  ];

  return (
    <section className={styles.section} aria-labelledby="econ-title" data-avoid-pill>
      <header className={styles.intro}>
        <p className={styles.flag}>Illustrative model</p>
        <h2 id="econ-title" className={styles.title}>
          If the lift isn&rsquo;t real, you shouldn&rsquo;t pay for it.
        </h2>
        <p className={styles.lede}>
          The example brand from our business model on a console. Turn any knob. Two things the simple version leaves out are built in:
          you keep margin, not revenue, and the holdout comes out of the people you could have messaged.
        </p>
      </header>

      <div className={styles.room}>
        <div ref={desk} className={styles.console} role="group" aria-label="Model inputs">
          <p className={`${styles.plate} t-hud`}>Inputs</p>
          <div className={styles.knobs}>
            {KNOBS.map((k) => (
              <RotaryKnob key={k.key} label={k.label} value={inputs[k.key]} min={k.min} max={k.max} step={k.step} onChange={set(k.key)} format={k.format} size="s" />
            ))}
          </div>
          <div className={styles.margin}>
            <LeverSwitch
              label="Margin you keep"
              positions={MARGINS.map((m) => `${m} %`)}
              value={marginStop}
              onChange={(i) => setInputs((s) => ({ ...s, marginPct: MARGINS[i] ?? 50 }))}
              mode="select"
              size="m"
            />
          </div>
          <p className={`${styles.hint} t-small`}>Message cost is a modelling assumption: check the current rate before relying on it.</p>
          <button type="button" className={styles.reset} onClick={() => setInputs(REPORT_CASE)}>
            Reset to the example brand
          </button>
        </div>

        <div className={styles.readout} aria-live="polite">
          <div className={styles.basis}>
            <ToggleSwitch label="Basis" checked={view === "margin"} onChange={(on) => setView(on ? "margin" : "revenue")} offLabel="On revenue" onLabel="On margin" />
          </div>
          <Gauge value={net} lo={lo} hi={hi} />
          <p className={styles.heroLabel}>Net gain a month, after fee and messages</p>
          <p className={styles.heroValue} data-negative={net < 0 ? "1" : undefined}>
            {rupees(net)}
          </p>
          <RangeBar value={net} lo={lo} hi={hi} />
          <p className={styles.rangeNote}>
            {r.lift.excludesZero
              ? `95 % range from a ${inputs.holdoutPct} % holdout of ${count(r.held)} shoppers: the lift is measurable, the money spans ${rupees(lo)} to ${rupees(hi)}.`
              : `With a ${inputs.holdoutPct} % holdout of ${count(r.held)} shoppers, one month cannot rule out zero lift. Raise the holdout, or run longer.`}
          </p>
        </div>

        <div className={styles.trail}>
          <Waterfall steps={steps} />
          <dl className={styles.facts}>
            <div>
              <dt>Recovered orders</dt>
              <dd className="t-num">{count(r.recovered)}</dd>
            </div>
            <div>
              <dt>Would not have happened</dt>
              <dd className="t-num">{count(r.incrementalOrders)}</dd>
            </div>
            <div>
              <dt>Return on spend</dt>
              <dd className="t-num">{r.multiple.toFixed(1)}×</dd>
            </div>
          </dl>
          <button type="button" className={styles.print} onClick={() => setPrintId((n) => n + 1)} data-cursor="tap">
            Print the paper trail
          </button>
          <ReceiptPrinter label="Paper trail" lines={receipt} printId={printId} idleText="Every number, printed on demand" className={styles.receipt} />
        </div>
      </div>

      <p className={styles.reportCase}>
        The simple version, on revenue and before any holdout: {rupees(report.netRevenue)} net, roughly 3× the spend.
      </p>
      <details className={styles.table}>
        <summary>Every number in a table</summary>
        <table>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                <td className="t-num">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
