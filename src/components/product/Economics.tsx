"use client";

import { useId, useMemo, useState } from "react";
import { REPORT_CASE, count, model, pct, rupees, type Inputs } from "@/lib/economics";
import styles from "./Economics.module.css";

type Field = {
  key: keyof Inputs;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  hint?: string;
};

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Your store",
    fields: [
      { key: "orders", label: "Orders a month", min: 200, max: 20000, step: 100, format: count },
      { key: "aov", label: "Average order value", min: 300, max: 8000, step: 50, format: rupees },
      { key: "carts", label: "Abandoned carts a month", min: 500, max: 50000, step: 100, format: count },
      { key: "messageablePct", label: "Carts with a consented phone", min: 5, max: 80, step: 1, format: (v) => `${v}%` },
    ],
  },
  {
    title: "Messaging",
    fields: [
      { key: "messagesPerCart", label: "Messages per cart, with follow-ups", min: 1, max: 3, step: 0.1, format: (v) => v.toFixed(1) },
      {
        key: "messageCost",
        label: "Cost per marketing message",
        min: 0.1,
        max: 2,
        step: 0.01,
        format: (v) => `₹${v.toFixed(2)}`,
        hint: "Modelling assumption. Check the current rate before relying on it.",
      },
    ],
  },
  {
    title: "Response",
    fields: [
      { key: "orderRatePct", label: "Messaged shoppers who order", min: 0.5, max: 12, step: 0.1, format: (v) => `${v.toFixed(1)}%` },
      { key: "incrementalPct", label: "Of those, orders that are incremental", min: 0, max: 100, step: 1, format: (v) => `${v}%` },
    ],
  },
  {
    title: "Your economics",
    fields: [
      { key: "fee", label: "Software fee a month", min: 0, max: 100000, step: 500, format: rupees },
      {
        key: "marginPct",
        label: "Contribution margin",
        min: 5,
        max: 100,
        step: 1,
        format: (v) => `${v}%`,
        hint: "You keep margin, not revenue. Set your own.",
      },
    ],
  },
  {
    title: "Measurement",
    fields: [
      {
        key: "holdoutPct",
        label: "Holdout, never messaged",
        min: 2,
        max: 50,
        step: 1,
        format: (v) => `${v}%`,
        hint: "A bigger holdout costs lift now and buys certainty.",
      },
    ],
  },
];

function Slider({ field, value, onChange }: { field: Field; value: number; onChange: (v: number) => void }) {
  const id = useId();
  const p = ((value - field.min) / (field.max - field.min)) * 100;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        <span>{field.label}</span>
        <output htmlFor={id} className="t-num">
          {field.format(value)}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.range}
        style={{ "--p": `${p}%` } as React.CSSProperties}
        data-cursor="drag"
        data-cursor-label="Drag"
      />
      {field.hint ? <p className={styles.hint}>{field.hint}</p> : null}
    </div>
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

export function Economics() {
  const [inputs, setInputs] = useState<Inputs>(REPORT_CASE);
  const [view, setView] = useState<"margin" | "revenue">("margin");
  const r = useMemo(() => model(inputs), [inputs]);
  const report = useMemo(() => model({ ...REPORT_CASE, holdoutPct: 0, marginPct: 100 }), []);

  const set = (key: keyof Inputs) => (v: number) => setInputs((s) => ({ ...s, [key]: v }));
  const net = view === "margin" ? r.netMargin : r.netRevenue;
  const lo = view === "margin" ? r.netMarginLo : r.netRevenueLo;
  const hi = view === "margin" ? r.netMarginHi : r.netRevenueHi;

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

  return (
    <section className={styles.section} aria-labelledby="econ-title">
      <div className={styles.intro}>
        <p className={styles.flag}>Illustrative model</p>
        <h2 id="econ-title" className={styles.title}>
          If the lift isn&rsquo;t real, you shouldn&rsquo;t pay for it.
        </h2>
        <p className={styles.lede}>
          The example brand from our report, made adjustable. Two things the report&rsquo;s simple version leaves out
          are built in: you keep margin, not revenue, and the holdout comes out of the people you could have messaged.
          Replace every number with your own.
        </p>
      </div>

      <div className={styles.grid}>
        <form className={styles.inputs} onSubmit={(e) => e.preventDefault()} aria-label="Model inputs">
          {GROUPS.map((g) => (
            <fieldset key={g.title} className={styles.group}>
              <legend>{g.title}</legend>
              {g.fields.map((f) => (
                <Slider key={f.key} field={f} value={inputs[f.key]} onChange={set(f.key)} />
              ))}
            </fieldset>
          ))}
          <button type="button" className={styles.reset} onClick={() => setInputs(REPORT_CASE)}>
            Reset to the report&rsquo;s example
          </button>
        </form>

        <div className={styles.results} aria-live="polite">
          <div className={styles.toggle} role="radiogroup" aria-label="Basis">
            <button type="button" role="radio" aria-checked={view === "margin"} onClick={() => setView("margin")}>
              On margin
            </button>
            <button type="button" role="radio" aria-checked={view === "revenue"} onClick={() => setView("revenue")}>
              On revenue, as in the report
            </button>
          </div>

          <div className={styles.hero}>
            <p className={styles.heroLabel}>Net gain a month, after fee and messages</p>
            <p className={styles.heroValue} data-negative={net < 0 ? "1" : undefined}>
              {rupees(net)}
            </p>
            <RangeBar value={net} lo={lo} hi={hi} />
            <p className={styles.rangeNote}>
              {r.lift.excludesZero ? (
                <>
                  95% range from a {inputs.holdoutPct}% holdout of {count(r.held)} shoppers. The lift is measurable; the
                  money still spans {rupees(lo)} to {rupees(hi)}.
                </>
              ) : (
                <>
                  With a {inputs.holdoutPct}% holdout of {count(r.held)} shoppers, one month cannot rule out zero lift.
                  Raise the holdout, or run longer.
                </>
              )}
            </p>
          </div>

          <Waterfall steps={steps} />

          <dl className={styles.facts}>
            <div>
              <dt>Messaged</dt>
              <dd className="t-num">{count(r.messaged)}</dd>
            </div>
            <div>
              <dt>Held out</dt>
              <dd className="t-num">{count(r.held)}</dd>
            </div>
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
            <div>
              <dt>Recovered vs monthly orders</dt>
              <dd className="t-num">{pct(r.recoveredShareOfOrders)}</dd>
            </div>
          </dl>

          <p className={styles.reportCase}>
            The report&rsquo;s own example, on revenue and before any holdout: {rupees(report.netRevenue)} net, roughly 3×
            the spend.
          </p>

          <details className={styles.table}>
            <summary>Every number in a table</summary>
            <table>
              <tbody>
                {[
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
                ].map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td className="t-num">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      </div>
    </section>
  );
}
