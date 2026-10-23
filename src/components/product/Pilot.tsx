import { TransitionLink } from "@/components/transition/navigation";
import styles from "./Pilot.module.css";

/** The sales motion and onboarding SOP from the business report, sections 11.3 and 12.3. */
const MOTION = [
  { step: "Store audit", time: "20 min", body: "We study your store, payment methods, COD share and current messaging, then walk you through what we found." },
  { step: "Live demo", time: "15 min", body: "Your own store's flow, mocked in our system." },
  { step: "Pilot", time: "30 days", body: "Two or three playbooks, the holdout switched on, and the success metric agreed before anything is sent." },
  { step: "Week-four review", time: "1 call", body: "Incremental revenue against the holdout. If there is no lift, we say so." },
  { step: "Monthly plan", time: "Ongoing", body: "Convert, then add playbooks where the numbers earn them." },
];

const ONBOARDING = [
  { days: "Day 0", task: "Contract, data processing agreement, kickoff, access to the store, gateway and WhatsApp Business account" },
  { days: "Days 1–2", task: "Install the script and the Shopify app, verify events, connect gateway webhooks" },
  { days: "Days 3–4", task: "Consent capture at checkout and login, design the opt-in widget" },
  { days: "Days 5–7", task: "Write and submit templates, configure the first three flows with caps and quiet hours" },
  { days: "Day 8", task: "Soft launch to a small share of traffic, holdout on" },
  { days: "Days 9–14", task: "Watch deliverability, quality rating and conversions, fix, share the first report" },
];

const PLANS = [
  { name: "Launch", who: "Small brands, one store", has: "Three core playbooks, dashboard, onboarding" },
  { name: "Growth", who: "Scaling brands", has: "All playbooks, segments, A/B tests and holdout, priority support" },
  { name: "Scale", who: "Larger brands and agencies", has: "Custom flows, integrations, SLA, optional revenue share" },
];

export function Pilot() {
  return (
    <section className={`band ${styles.section}`} aria-labelledby="pilot-title">
      <div className={styles.head}>
        <h2 id="pilot-title" className={styles.title}>
          How a pilot runs
        </h2>
        <p className={styles.lede}>
          Thirty days, a holdout from day one, and a number agreed before we start. Our proposal is that message fees
          pass through at Meta&rsquo;s actual rates, on your own WhatsApp Business account where possible.
        </p>
      </div>

      <ol className={styles.motion}>
        {MOTION.map((m, i) => (
          <li key={m.step}>
            <span className={styles.n}>{String(i + 1).padStart(2, "0")}</span>
            <h3>{m.step}</h3>
            <p className={styles.time}>{m.time}</p>
            <p>{m.body}</p>
          </li>
        ))}
      </ol>

      <div className={styles.split}>
        <div>
          <h3 className={styles.sub}>The first fourteen days</h3>
          <ol className={styles.days}>
            {ONBOARDING.map((o) => (
              <li key={o.days}>
                <span className="t-num">{o.days}</span>
                <p>{o.task}</p>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className={styles.sub}>Proposed plans</h3>
          <ul className={styles.plans}>
            {PLANS.map((p) => (
              <li key={p.name}>
                <div className={styles.planHead}>
                  <strong>{p.name}</strong>
                  <span className="fill">[ FILL: ₹ a month ]</span>
                </div>
                <p className={styles.who}>{p.who}</p>
                <p>{p.has}</p>
              </li>
            ))}
          </ul>
          <p className={styles.fine}>Plans are proposals, still being validated with pilot partners.</p>
        </div>
      </div>

      <div className={styles.cta}>
        <TransitionLink href="/contact?intent=audit" className={`${styles.button} cta`} data-magnetic data-cursor="open">
          Book the 20-minute store audit
        </TransitionLink>
      </div>
    </section>
  );
}
