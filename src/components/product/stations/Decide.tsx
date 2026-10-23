"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Station } from "../Station";
import { identity, setConsent } from "@/components/gl/scenes/identify/identity";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { useIdleDemo } from "@/lib/useIdleDemo";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import styles from "./decide.module.css";

/**
 * The switchyard. Events are dropped on the entry track and run the rules in the order
 * the report lists them (section 3.1): consent, suppression, holdout, frequency cap,
 * quiet hours, then the template that fits. Rule values are examples.
 */

type Token = { id: string; event: string; detail: string; kind: "utility" | "marketing"; ordered: boolean; template: string };

const TOKENS: Token[] = [
  { id: "pf", event: "payment_failed", detail: "reason: upi_timeout", kind: "utility", ordered: false, template: "payment_failed, utility" },
  { id: "cod", event: "order_created", detail: "payment: cod", kind: "utility", ordered: false, template: "cod_confirm, utility" },
  { id: "cart", event: "cart_abandoned", detail: "33 min ago", kind: "marketing", ordered: false, template: "cart_recovery, marketing" },
  { id: "browse", event: "product_view ×3", detail: "no cart, 24 h", kind: "marketing", ordered: false, template: "browse_abandonment, marketing" },
  { id: "done", event: "checkout_started", detail: "then ordered", kind: "marketing", ordered: true, template: "" },
];

const GATES = [
  { id: "consent", x: 170, name: "Consent", stop: "Blocked: no marketing consent" },
  { id: "suppress", x: 310, name: "Suppression", stop: "Stopped: they already ordered" },
  { id: "holdout", x: 450, name: "Holdout", stop: "Held out: never messaged, counted" },
  { id: "cap", x: 590, name: "Frequency cap", stop: "Capped: one a day, try tomorrow" },
  { id: "quiet", x: 730, name: "Quiet hours", stop: "Waiting: quiet until 9:00" },
] as const;

type GateId = (typeof GATES)[number]["id"];

const MAIN_Y = 110;
const END_X = 960;
const sidingPath = (x: number) => `M40 ${MAIN_Y} H${x} C${x + 26} ${MAIN_Y} ${x + 52} ${MAIN_Y + 30} ${x + 52} ${MAIN_Y + 96} V${MAIN_Y + 250}`;
const mainPath = `M40 ${MAIN_Y} H${END_X}`;

type Rules = { consent: boolean; hour: number; sentToday: number; inHoldout: boolean };

const quiet = (h: number) => h >= 21 || h < 9;

/** Which gate stops this token, or null if it goes out. */
const decide = (t: Token, r: Rules): GateId | null => {
  if (t.kind === "marketing" && !r.consent) return "consent";
  if (t.ordered) return "suppress";
  if (t.kind === "marketing" && r.inHoldout) return "holdout";
  if (t.kind === "marketing" && r.sentToday >= 1) return "cap";
  if (t.kind === "marketing" && quiet(r.hour)) return "quiet";
  return null;
};

type Run = { token: Token; stop: GateId | null; at: string };

function Yard({ runs, active, gateState }: { runs: Run[]; active: Run | null; gateState: Partial<Record<GateId, "pass" | "stop">> }) {
  const marker = useRef<SVGGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!active || !marker.current || !pathRef.current) return;
    const path = pathRef.current;
    const len = path.getTotalLength();
    const s = { t: 0 };
    const place = () => {
      const p = path.getPointAtLength(s.t * len);
      marker.current?.setAttribute("transform", `translate(${p.x} ${p.y})`);
    };
    if (prefersReducedMotion()) {
      s.t = 1;
      place();
      return;
    }
    const tween = gsap.to(s, { t: 1, duration: 1.8, ease: "drift", onUpdate: place });
    return () => {
      tween.kill();
    };
  }, [active]);

  const d = active ? (active.stop ? sidingPath(GATES.find((g) => g.id === active.stop)!.x) : mainPath) : mainPath;

  return (
    <svg viewBox="0 0 1000 400" className={styles.yard} role="img" aria-label="The rules, drawn as a railway yard">
      {/* sidings */}
      {GATES.map((g) => (
        <g key={g.id} data-state={gateState[g.id]}>
          <path d={sidingPath(g.x)} className={styles.siding} />
          <rect x={g.x + 40} y={MAIN_Y + 250} width={24} height={6} className={styles.buffer} />
          <text x={g.x + 52} y={MAIN_Y + 278} className={styles.stopText} textAnchor="middle">
            {g.stop.split(":")[0]}
          </text>
          <line x1={g.x} y1={MAIN_Y - 16} x2={g.x} y2={MAIN_Y + 16} className={styles.gateTick} />
          <text x={g.x} y={MAIN_Y - 30} className={styles.gateName} textAnchor="middle">
            {g.name}
          </text>
          <rect x={g.x - 7} y={MAIN_Y - 7} width={14} height={14} className={styles.lamp} />
        </g>
      ))}
      {/* the main line */}
      <path d={mainPath} className={styles.main} />
      <rect x={END_X - 4} y={MAIN_Y - 22} width={8} height={44} className={styles.end} />
      <text x={END_X - 14} y={MAIN_Y - 32} className={styles.gateName} textAnchor="end">
        Template, then send
      </text>
      <text x={40} y={MAIN_Y - 32} className={styles.gateName}>
        Entry
      </text>
      {/* the route the current token takes, drawn bright */}
      <path ref={pathRef} d={d} className={styles.route} data-on={active ? "1" : undefined} />
      {active ? (
        <g ref={marker} className={styles.marker} transform={`translate(40 ${MAIN_Y})`}>
          <rect x={-9} y={-9} width={18} height={18} />
        </g>
      ) : null}
      {/* ticks along the main line */}
      {Array.from({ length: 46 }, (_, i) => (
        <line key={i} x1={40 + i * 20} y1={MAIN_Y + 8} x2={40 + i * 20} y2={MAIN_Y + 12} className={styles.tick} />
      ))}
      <text x={40} y={392} className={styles.count}>
        {runs.length} run{runs.length === 1 ? "" : "s"}
      </text>
    </svg>
  );
}

export function Decide() {
  const hourId = useId();
  const consent = useStore(identity, (s) => s.consent);
  const [hour, setHour] = useState(15);
  const [sentToday, setSentToday] = useState(0);
  const [inHoldout, setInHoldout] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [active, setActive] = useState<Run | null>(null);
  const [gateState, setGateState] = useState<Partial<Record<GateId, "pass" | "stop">>>({});
  const [drag, setDrag] = useState<{ token: Token; x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const entry = useRef<HTMLDivElement>(null);
  const yard = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const run = (token: Token, auto = false) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const stop = decide(token, { consent, hour, sentToday, inHoldout });
    const r: Run = { token, stop, at: new Date().toISOString() };
    setActive(r);
    setGateState({});
    sfx.tick();
    if (!auto) haptic(6);
    // light the gates in order as the token reaches them
    const reached = stop ? GATES.findIndex((g) => g.id === stop) : GATES.length - 1;
    GATES.forEach((g, i) => {
      if (i > reached) return;
      timers.current.push(
        window.setTimeout(
          () => {
            setGateState((s) => ({ ...s, [g.id]: g.id === stop ? "stop" : "pass" }));
            if (g.id === stop) sfx.deny();
            else sfx.tick();
          },
          prefersReducedMotion() ? 0 : 260 + i * 260,
        ),
      );
    });
    timers.current.push(
      window.setTimeout(
        () => {
          setRuns((list) => [r, ...list].slice(0, 6));
          if (!stop) {
            sfx.ping();
            if (token.kind === "marketing") setSentToday((n) => Math.min(2, n + 1));
          }
        },
        prefersReducedMotion() ? 0 : 1800,
      ),
    );
  };

  // pointer drag of a token onto the entry track
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      const r = entry.current?.getBoundingClientRect();
      setOver(!!r && e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom);
    };
    const up = (e: PointerEvent) => {
      const r = entry.current?.getBoundingClientRect();
      const hit = !!r && e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
      if (hit) run(drag.token);
      setDrag(null);
      setOver(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // run captures the current rules by closure, which is what we want at drop time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  // until someone drags a token, the yard routes one on its own every few seconds
  useIdleDemo(yard, (n) => run(TOKENS[n % TOKENS.length], true), 3800, 1200);

  const last = runs[0];
  const outcome = (r: Run) => (r.stop ? GATES.find((g) => g.id === r.stop)!.stop : `Sent: ${r.token.template}`);

  return (
    <Station
      id="decide"
      index="04"
      name="Decide"
      mark="3:00"
      moment="UPI_TIMEOUT: the gateway says why"
      title="Rules decide. Caps, quiet hours and the holdout get the last word."
      height="220svh"
      lede={
        <p>
          Drag an event onto the entry track. It runs the rules in order, and the first rule that says no wins. Utility messages, like a
          failed payment or a COD confirmation, skip the marketing rules. Rule values here are examples.
        </p>
      }
      stage={
        <div ref={yard} className={styles.stage}>
          <div ref={entry} className={styles.entry} data-over={over ? "1" : undefined}>
            <span className="t-hud">Drop an event here</span>
          </div>
          <Yard runs={runs} active={active} gateState={gateState} />
          <div className={styles.tray} role="list" aria-label="Events to route">
            {TOKENS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="listitem"
                className={styles.token}
                data-kind={t.kind}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDrag({ token: t, x: e.clientX, y: e.clientY });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    run(t);
                  }
                }}
                aria-label={`Route ${t.event}, ${t.detail}, a ${t.kind} event`}
                data-cursor="drag"
              >
                <code>{t.event}</code>
                <span className="t-hud">{t.detail}</span>
              </button>
            ))}
          </div>
          <p className={styles.outcome} aria-live="polite">
            {last ? (
              <>
                <span className="t-hud c-muted">{last.token.event}</span>
                <b>{outcome(last)}</b>
              </>
            ) : (
              <span className="t-small c-muted">Nothing routed yet. Drag a token, or focus one and press Enter.</span>
            )}
          </p>
          {drag ? (
            <div className={styles.ghost} style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }} aria-hidden>
              <code>{drag.token.event}</code>
            </div>
          ) : null}
        </div>
      }
    >
      <div className={styles.rules}>
        <label className={styles.rule}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className={styles.ruleBox} aria-hidden />
          <span>Marketing consent on file</span>
        </label>
        <label className={styles.rule}>
          <input type="checkbox" checked={inHoldout} onChange={(e) => setInHoldout(e.target.checked)} />
          <span className={styles.ruleBox} aria-hidden />
          <span>This shopper drew the holdout</span>
        </label>
        <div className={styles.stepper}>
          <span>Marketing messages today</span>
          <span className={styles.stepperCtl}>
            <button type="button" onClick={() => setSentToday((n) => Math.max(0, n - 1))} aria-label="One fewer">
              −
            </button>
            <output className="t-fig">{sentToday}</output>
            <button type="button" onClick={() => setSentToday((n) => Math.min(2, n + 1))} aria-label="One more">
              +
            </button>
          </span>
        </div>
        <div className={styles.clock}>
          <label htmlFor={hourId}>
            <span>Time of day</span>
            <output className="t-fig">{String(hour).padStart(2, "0")}:00</output>
          </label>
          <input
            id={hourId}
            type="range"
            min={0}
            max={23}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            style={{ "--p": `${(hour / 23) * 100}%` } as React.CSSProperties}
            data-quiet={quiet(hour) ? "1" : undefined}
            data-cursor="drag"
          />
          <span className="t-hud c-muted">{quiet(hour) ? "Quiet hours, 21:00 to 9:00" : "Open hours"}</span>
        </div>
      </div>
    </Station>
  );
}
