"use client";

import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { useTransitionRouter } from "@/components/transition/navigation";
import { ScrubTimeline } from "@/components/kit/ScrubTimeline";
import { LeverSwitch } from "@/components/kit/LeverSwitch";
import { scrollToY } from "@/components/providers/SmoothScroll";
import { PLAN_PRICES, SHOW_PRICING } from "@/config/site";
import { ScrollTrigger, prefersReducedMotion } from "@/lib/motion";
import { awardStamp } from "@/lib/stamps";
import { visit } from "@/lib/visit";
import { sfx } from "@/lib/sound";
import styles from "./Pilot.module.css";

/** The sales motion and onboarding SOP from the business report, sections 11.3 and 12.3. */
const MOTION = [
  { step: "Store audit", time: "20 min", body: "We study your store, payment methods, COD share and current messaging, then walk you through what we found." },
  { step: "Live demo", time: "15 min", body: "Your own store's flow, mocked in our system." },
  { step: "Pilot", time: "30 days", body: "Two or three playbooks, the holdout switched on, and the success metric agreed before anything is sent." },
  { step: "Week-four review", time: "1 call", body: "Incremental revenue against the holdout. If there is no lift, we say so." },
  { step: "Monthly plan", time: "Ongoing", body: "Convert, then add playbooks where the numbers earn them." },
];

/** the calendar days each onboarding stop spans */
const SPANS: [number, number][] = [
  [0, 0],
  [1, 2],
  [3, 4],
  [5, 7],
  [8, 8],
  [9, 14],
];

const ONBOARDING = [
  { days: "Day 0", task: "Contract, data processing agreement, kickoff, access to the store, gateway and WhatsApp Business account", checks: ["Contract", "DPA", "Access"] },
  { days: "Days 1–2", task: "Install the script and the Shopify app, verify events, connect gateway webhooks", checks: ["Script", "App", "Webhooks"] },
  { days: "Days 3–4", task: "Consent capture at checkout and login, design the opt-in widget", checks: ["Checkout opt-in", "Login opt-in", "Widget"] },
  { days: "Days 5–7", task: "Write and submit templates, configure the first three flows with caps and quiet hours", checks: ["Templates", "Three flows", "Caps"] },
  { days: "Day 8", task: "Soft launch to a small share of traffic, holdout on", checks: ["Soft launch", "Holdout on"] },
  { days: "Days 9–14", task: "Watch deliverability, quality rating and conversions, fix, share the first report", checks: ["Deliverability", "Quality", "First report"] },
];

const PLANS = [
  { id: "launch", name: "Launch", who: "Small brands, one store", has: ["Three core playbooks", "Dashboard", "Onboarding"], lamps: 3 },
  { id: "growth", name: "Growth", who: "Scaling brands", has: ["All ten playbooks", "Segments", "A/B tests and holdout", "Priority support"], lamps: 10 },
  { id: "scale", name: "Scale", who: "Larger brands and agencies", has: ["Custom flows", "Integrations", "SLA", "Optional revenue share"], lamps: 10 },
] as const;

/** P12, the flight plan: the first fourteen days as a route the scroll flies, a drop of light on it. */
function FlightPlan() {
  const root = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (s) => {
        const k = Math.min(ONBOARDING.length - 1, Math.floor(s.progress * ONBOARDING.length));
        setI((cur) => (cur === k ? cur : k));
        el.style.setProperty("--p", s.progress.toFixed(4));
      },
    });
    return () => st.kill();
  }, []);
  const go = (k: number) => {
    const el = root.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollToY(top + ((k + 0.1) / ONBOARDING.length) * (el.offsetHeight - window.innerHeight), 0.9);
  };
  const o = ONBOARDING[i]!;
  return (
    <section ref={root} className={styles.flight} aria-labelledby="pilot-title" style={{ "--n": ONBOARDING.length } as CSSProperties} data-avoid-pill>
      <div className={styles.flightSticky}>
        <header className={styles.head}>
          <h2 id="pilot-title" className={styles.title}>
            How a pilot runs
          </h2>
          <p className={styles.lede}>
            Thirty days, a holdout from day one, and a number agreed before we start. Message fees pass through at Meta&rsquo;s actual rates, on
            your own WhatsApp Business account where possible.
          </p>
        </header>
        <ol className={styles.motion} aria-label="From first call to monthly plan">
          {MOTION.map((m, k) => (
            <li key={m.step} data-here={k === 2 ? "1" : undefined}>
              <span className={styles.n}>{String(k + 1).padStart(2, "0")}</span>
              <h3>{m.step}</h3>
              <p className={styles.time}>{m.time}</p>
            </li>
          ))}
        </ol>
        <div className={styles.route}>
          <p className={`${styles.routeHead} t-hud`}>The first fourteen days</p>
          <ScrubTimeline label="The first fourteen days" stops={ONBOARDING.map((x) => ({ id: x.days, label: x.days }))} index={i} onChange={go} />
        </div>
        <ol className={styles.calendar} aria-hidden>
          {Array.from({ length: 15 }, (_, d) => {
            const [a, b] = SPANS[i]!;
            return (
              <li key={d} data-now={d >= a && d <= b ? "1" : undefined} data-past={d < a ? "1" : undefined}>
                <span>{d}</span>
              </li>
            );
          })}
        </ol>
        <div className={styles.day} aria-live="polite">
          <p className={styles.dayName} key={o.days}>
            {o.days}
          </p>
          <p className={styles.dayTask}>{o.task}</p>
          <ul className={styles.checks}>
            {o.checks.map((c, k) => (
              <li key={`${o.days}-${c}`} style={{ "--k": k } as CSSProperties}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * The plans as cartridges on a shelf: drag one into the machine's slot (or press it)
 * and the machine lights what it includes. Prices show only when the client sets
 * them; until then the slot reads "Pricing with your pilot".
 */
function Cartridges() {
  const [loaded, setLoaded] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const plan = PLANS.find((p) => p.id === loaded);
  const load = (id: string) => {
    setLoaded(id);
    sfx.clink();
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData("text/plan");
    if (id) load(id);
  };
  return (
    <div className={styles.shelfWrap}>
      <div className={styles.shelf} role="group" aria-label="Proposed plans">
        {PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.cart}
            data-loaded={loaded === p.id ? "1" : undefined}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plan", p.id)}
            onClick={() => load(p.id)}
            aria-pressed={loaded === p.id}
            data-cursor="drag"
          >
            <span className={styles.cartLabel}>{p.name}</span>
            <span className={styles.cartWho}>{p.who}</span>
            <span className={styles.cartPins} aria-hidden>
              {Array.from({ length: 8 }, (_, k) => (
                <i key={k} />
              ))}
            </span>
          </button>
        ))}
      </div>
      <div
        className={styles.machine}
        data-over={over ? "1" : undefined}
        data-loaded={plan ? "1" : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <p className={`${styles.slotHead} t-hud`}>{plan ? `${plan.name} loaded` : "Drop a plan in the slot"}</p>
        <div className={styles.slot} aria-hidden>
          <span />
        </div>
        <div className={styles.lamps} aria-hidden>
          {Array.from({ length: 10 }, (_, k) => (
            <i key={k} data-on={plan && k < plan.lamps ? "1" : undefined} style={{ "--k": k } as CSSProperties} />
          ))}
          <span className="t-hud">playbooks</span>
        </div>
        <ul className={styles.includes} aria-live="polite">
          {(plan?.has ?? ["Pick a plan to see what it runs"]).map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <p className={styles.price}>
          {plan && SHOW_PRICING && PLAN_PRICES[plan.id] ? PLAN_PRICES[plan.id] : <span className={styles.scoped}>Pricing with your pilot</span>}
        </p>
        <p className={styles.fine}>Plans are proposals, still being validated with pilot partners.</p>
      </div>
    </div>
  );
}

/**
 * P12 and P13: the flight plan, the plans, and a lever that starts a pilot. Pulling it
 * opens the conversation with the pilot intent; with every rule patched into the
 * machine earlier on the page, it also stamps the Operator.
 */
export function Pilot() {
  const go = useTransitionRouter();
  const pull = () => {
    const v = visit.get();
    if (v.allRules && v.lastSent) awardStamp("operator");
    sfx.relay();
    window.setTimeout(() => void go("/contact?intent=pilot"), prefersReducedMotion() ? 0 : 420);
  };
  return (
    <>
      <FlightPlan />
      <section className={`band ${styles.section}`} aria-labelledby="plans-title" data-avoid-pill>
        <div className={styles.plansHead}>
          <h3 id="plans-title" className={styles.sub}>
            Proposed plans, as cartridges
          </h3>
          <p className={styles.plansLede}>Drag a plan into the machine, or press it, and see what it runs.</p>
        </div>
        <Cartridges />
        <div className={styles.close}>
          <LeverSwitch label="Run a pilot" positions={["Ready", "Run"]} mode="pull" onPull={pull} size="m" />
          <div>
            <p className={styles.closeTitle}>Pull to start a pilot.</p>
            <p className={styles.closeLine}>It opens a conversation with us, set to a pilot. Thirty days, a holdout, a number agreed first.</p>
          </div>
        </div>
      </section>
    </>
  );
}
