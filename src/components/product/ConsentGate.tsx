"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { Phone, type ChatMessage } from "./Phone";
import styles from "./ConsentGate.module.css";

type Purpose = "utility" | "marketing";
type LogLine = { id: number; at: string; text: string; tone?: "deny" | "ok" };
type Record_ = { who: string; when: string; wording: string; channel: string; state: "granted" | "withdrawn" };

const WORDING = "Send me offers on WhatsApp";
const now = () =>
  new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date());

const MSG: Record<Purpose, Omit<ChatMessage, "id">> = {
  utility: {
    from: "brand",
    tag: "Utility",
    text: "Your payment of ₹1,499 didn't go through. Your cart is saved.",
    buttons: ["Retry in one tap"],
  },
  marketing: {
    from: "brand",
    tag: "Marketing",
    text: "Your Forest hoodie is still in your cart.",
    buttons: ["Complete your order"],
  },
};

const HOLD_MS = 1400;

export function ConsentGate() {
  const [consent, setConsent] = useState<Record<Purpose, boolean>>({ utility: true, marketing: true });
  const [flow, setFlow] = useState<"running" | "stopped">("running");
  const [record, setRecord] = useState<Record_>({
    who: "+91 98••• ••210",
    when: "at checkout",
    wording: WORDING,
    channel: "Checkout checkbox, unticked by default",
    state: "granted",
  });
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "d", from: "system", text: "Today" }]);
  const [log, setLog] = useState<LogLine[]>([]);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [hold, setHold] = useState(0);
  const machine = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const holdTween = useRef<gsap.core.Tween | null>(null);

  const push = (text: string, tone?: LogLine["tone"]) =>
    setLog((l) => [{ id: ++seq.current, at: now(), text, tone }, ...l].slice(0, 6));

  const slam = (reason: string) => {
    setBlocked(reason);
    sfx.deny();
    const gate = machine.current?.querySelector("[data-gate]");
    if (gate && !prefersReducedMotion()) {
      gsap.fromTo(gate, { x: -6 }, { x: 0, duration: 0.4, ease: "elastic.out(1, 0.3)" });
    }
  };

  /** Animate a packet from the shopper to the gate, and on to the phone if allowed. */
  const send = (purpose: Purpose) => {
    const allowed = consent[purpose] && (purpose === "utility" || flow === "running");
    const el = machine.current;
    const packet = el?.querySelector<HTMLElement>("[data-packet]");
    const reduced = prefersReducedMotion();
    setBlocked(null);

    const land = () => {
      if (!allowed) {
        push(`send_blocked {purpose: ${purpose}, reason: no_${purpose}_consent}`, "deny");
        slam(purpose === "marketing" && flow === "stopped" ? "Stopped by the shopper" : "No consent");
        return;
      }
      push(`message_sent {template: ${purpose === "utility" ? "payment_failed" : "cart_reminder"}, category: ${purpose}}`, "ok");
      sfx.ok();
      setMessages((m) => [...m, { ...MSG[purpose], id: `m${++seq.current}`, time: now().slice(0, 5) }].slice(-4));
    };

    if (!packet || reduced) return land();
    const tl = gsap.timeline();
    tl.set(packet, { left: "4%", opacity: 1, scale: 1 });
    tl.to(packet, { left: "46%", duration: 0.55, ease: "glide" });
    if (allowed) {
      tl.to(packet, { left: "94%", duration: 0.5, ease: "glide" });
      tl.to(packet, { opacity: 0, duration: 0.1, onComplete: land });
    } else {
      tl.to(packet, { scale: 2.4, opacity: 0, duration: 0.18, ease: "cut", onComplete: land });
    }
  };

  const toggle = (purpose: Purpose) => {
    const on = !consent[purpose];
    setConsent((c) => ({ ...c, [purpose]: on }));
    push(`consent_${on ? "granted" : "withdrawn"} {purpose: ${purpose}, channel: whatsapp}`, on ? "ok" : "deny");
    if (purpose === "marketing") {
      setRecord((r) => ({
        ...r,
        when: now(),
        state: on ? "granted" : "withdrawn",
        channel: on ? "Re-granted in the demo" : r.channel,
      }));
      if (on) setFlow("running");
    }
    setBlocked(null);
  };

  const stop = () => {
    setMessages((m) =>
      [
        ...m,
        { id: `s${++seq.current}`, from: "shopper" as const, text: "STOP", time: now().slice(0, 5) },
        {
          id: `c${++seq.current}`,
          from: "brand" as const,
          tag: "Utility",
          text: "You won't get offers from us on WhatsApp. Order updates will continue.",
          time: now().slice(0, 5),
        },
      ].slice(-4),
    );
    setConsent((c) => ({ ...c, marketing: false }));
    setFlow("stopped");
    setRecord((r) => ({ ...r, when: now(), state: "withdrawn", channel: "Reply STOP on WhatsApp" }));
    push("consent_withdrawn {purpose: marketing, via: STOP}", "deny");
    push("flow_stopped {flow: cart_recovery, pending: 0}", "deny");
    sfx.deny();
  };

  // Press and hold: there is no override, and holding longer does not create one.
  const holdStart = () => {
    const state = { p: 0 };
    holdTween.current?.kill();
    holdTween.current = gsap.to(state, {
      p: 1,
      duration: HOLD_MS / 1000,
      ease: "none",
      onUpdate: () => setHold(state.p),
      onComplete: () => {
        setHold(0);
        push("override_requested {purpose: marketing}", "deny");
        push("override_refused {reason: consent_is_not_configurable}", "deny");
        slam("There is no override");
      },
    });
  };
  const holdEnd = () => {
    holdTween.current?.kill();
    setHold(0);
  };

  useEffect(
    () => () => {
      holdTween.current?.kill();
    },
    [],
  );

  const marketingLive = consent.marketing && flow === "running";

  return (
    <section className={styles.section} aria-labelledby="consent-title">
      <div className={styles.intro}>
        <h2 id="consent-title" className={styles.title}>
          Consent is not a setting. It is a wall.
        </h2>
        <p className={styles.lede}>
          Marketing consent is a separate, unticked box with a stored record of who agreed, when, to what wording, and
          where. If it is off, the pipeline physically refuses to send. STOP is honoured the moment it arrives. Try it.
        </p>
      </div>

      <div className={styles.grid}>
        <div className={styles.controls}>
          <div className={styles.switches}>
            {(["utility", "marketing"] as Purpose[]).map((purpose) => (
              <button
                key={purpose}
                type="button"
                role="switch"
                aria-checked={consent[purpose]}
                className={styles.switch}
                onClick={() => toggle(purpose)}
              >
                <span className={styles.switchLabel}>
                  {purpose === "utility" ? "Order and payment updates" : "Marketing messages"}
                  <small>{purpose === "utility" ? "Transactional purpose" : "Separate opt-in"}</small>
                </span>
                <span className={styles.track} aria-hidden>
                  <span className={styles.thumb} />
                </span>
              </button>
            ))}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.action} onClick={() => send("utility")}>
              Send the payment update
            </button>
            <button type="button" className={styles.action} onClick={() => send("marketing")}>
              Send the cart reminder
            </button>
            <button
              type="button"
              className={`${styles.action} ${styles.hold}`}
              onPointerDown={holdStart}
              onPointerUp={holdEnd}
              onPointerLeave={holdEnd}
              onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && holdStart()}
              onKeyUp={(e) => (e.key === " " || e.key === "Enter") && holdEnd()}
              aria-describedby="hold-hint"
            >
              <span className={styles.holdFill} style={{ transform: `scaleX(${hold})` }} aria-hidden />
              <span className={styles.holdText}>Hold to send without consent</span>
            </button>
            <p id="hold-hint" className={styles.fine}>
              Press and hold for {(HOLD_MS / 1000).toFixed(1)} s.
            </p>
            <button type="button" className={`${styles.action} ${styles.stop}`} onClick={stop} disabled={flow === "stopped"}>
              Shopper replies STOP
            </button>
          </div>
        </div>

        <div className={styles.machine} ref={machine}>
          <div className={styles.line} aria-hidden>
            <span className={styles.node} data-node="shopper">
              Shopper
            </span>
            <span className={styles.gate} data-gate data-open={marketingLive || consent.utility ? "1" : "0"}>
              <i />
              <i />
              Consent gate
            </span>
            <span className={styles.node} data-node="phone">
              Phone
            </span>
            <span className={styles.packet} data-packet />
          </div>

          <div className={styles.blocked} data-show={blocked ? "1" : "0"} role="status" aria-live="assertive">
            {blocked ? (
              <>
                <strong>Blocked</strong>
                <span>{blocked}</span>
              </>
            ) : null}
          </div>

          <div className={styles.record}>
            <p className={styles.recordTitle}>Consent record, marketing</p>
            <dl className={styles.recordRows}>
            <div>
              <dt>Who</dt>
              <dd className="t-num">{record.who}</dd>
            </div>
            <div>
              <dt>When</dt>
              <dd className="t-num">{record.when}</dd>
            </div>
            <div>
              <dt>Wording</dt>
              <dd>&ldquo;{record.wording}&rdquo;</dd>
            </div>
            <div>
              <dt>Channel</dt>
              <dd>{record.channel}</dd>
            </div>
            <div>
              <dt>State</dt>
              <dd data-state={record.state}>{record.state}</dd>
            </div>
            <div>
              <dt>Flow</dt>
              <dd data-state={flow === "running" ? "granted" : "withdrawn"}>Cart recovery {flow}</dd>
            </div>
            </dl>
          </div>

          <ol className={styles.log} aria-label="Pipeline log">
            {log.length === 0 ? <li className={styles.empty}>Nothing sent yet. Use the controls.</li> : null}
            {log.map((l) => (
              <li key={l.id} data-tone={l.tone}>
                <span className="t-num">{l.at}</span>
                <code>{l.text}</code>
              </li>
            ))}
          </ol>
        </div>

        <div className={styles.phone}>
          <Phone brand="Hoodie Co." time="15:05" messages={messages} label="What the shopper receives" />
        </div>
      </div>
    </section>
  );
}
