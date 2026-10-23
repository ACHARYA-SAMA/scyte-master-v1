"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { submitContact } from "@/app/contact/actions";
import { PAINS, REVENUE_RANGES, SERVICE_IDS, type ContactState } from "@/lib/contact-schema";
import { CONTACT_FLOW } from "@/lib/chat/contactFlow";
import { InteractivePhone } from "@/components/devices/InteractivePhone";
import { CopyEmail } from "@/components/shell/CopyEmail";
import { Clock } from "@/components/nav/Nav";
import { toast } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { track } from "@/lib/analytics";
import { useMedia } from "@/lib/useMedia";
import { SITE } from "@/config/site";
import { LetsTalk } from "./LetsTalk";
import styles from "./Conversation.module.css";

type Values = {
  intent: "audit" | "project";
  service: (typeof SERVICE_IDS)[number] | "";
  store: string;
  revenue: string;
  pains: string[];
  name: string;
  email: string;
  message: string;
};

const EMPTY: Values = { intent: "audit", service: "recovery", store: "", revenue: "", pains: [], name: "", email: "", message: "" };

const SERVICE_LABEL: Record<(typeof SERVICE_IDS)[number], string> = {
  recovery: "WhatsApp recovery",
  website: "Website",
  apps: "Mobile app",
  social: "Social media",
};

const initial: ContactState = { status: "idle" };

const AUDIT = [
  { when: "Before the call", what: "We go through your store as a shopper would: product pages, checkout, payment methods, how much is cash on delivery, the messages you send today." },
  { when: "On the call", what: "Twenty minutes. We show you where it leaks, with screenshots, and what we would fix first." },
  { when: "After", what: "A short written summary. If our platform is not the right fix, we say so." },
];

/** Contact as a conversation, over a real form that works without the chat. */
export function Conversation() {
  const uid = useId();
  const [values, setValues] = useState<Values>(EMPTY);
  const [filled, setFilled] = useState<string | null>(null);
  const [state, action, pending] = useActionState(submitContact, initial);
  const [inject, setInject] = useState<{ id: number; text: string; end?: boolean } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const viaChat = useRef(false);
  const small = useMedia("(max-width: 640px)");

  // ?intent=audit or ?service=website from the rest of the site
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const service = q.get("service");
    // the query is only known in the browser, after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (service && (SERVICE_IDS as readonly string[]).includes(service)) setValues((v) => ({ ...v, intent: service === "recovery" ? "audit" : "project", service: service as Values["service"] }));
    else if (q.get("intent") === "audit") setValues((v) => ({ ...v, intent: "audit", service: "recovery" }));
  }, []);

  // the server's answer, said by the phone as well as the form
  useEffect(() => {
    if (state.status === "sent") {
      sfx.ok();
      track("contact_sent", { intent: state.intent, via: viaChat.current ? "chat" : "form" });
      toast("Sent. It is in Scyte's inbox.", "ok");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the reply follows the server, not a render
      setInject({
        id: Date.now(),
        text: `Sent. Thanks${state.name ? `, ${state.name}` : ""}. We will write back from ${SITE.email}${state.intent === "audit" ? ", after we have looked at the store" : ""}.`,
        end: true,
      });
    }
    if (state.status === "error") {
      sfx.deny();
      setInject({ id: Date.now(), text: `Not sent: ${state.message} The form under the phone shows what needs fixing.` });
    }
  }, [state]);

  const onField = useCallback((name: string, value: string) => {
    setFilled(name);
    setValues((v) => {
      if (name === "pains") return { ...v, pains: v.pains.includes(value) ? v.pains : [...v.pains, value] };
      if (name === "intent") return { ...v, intent: value as Values["intent"] };
      if (name === "service") return { ...v, service: value as Values["service"] };
      return { ...v, [name]: value };
    });
  }, []);

  useEffect(() => {
    if (!filled) return;
    const t = window.setTimeout(() => setFilled(null), 1200);
    return () => window.clearTimeout(t);
  }, [filled]);

  const onOutcome = useCallback((o: string) => {
    if (o !== "sent") return;
    viaChat.current = true;
    // give React a tick to commit the last answer to the form
    window.setTimeout(() => form.current?.requestSubmit(), 60);
  }, []);

  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((s) => ({ ...s, [k]: v }));
  const errors = state.status === "error" ? state.fields : {};
  const sent = state.status === "sent";

  return (
    <div className={styles.page}>
      <section className={styles.top} aria-labelledby="contact-title">
        <div className={styles.left}>
          <p className="t-hud c-khaki" id="contact-title">
            Contact
          </p>
          <LetsTalk />
          <p className={styles.lede}>Talk to us the way your customers will talk to you: on a chat. Or use the form under it; it is the same thing.</p>
          <dl className={styles.facts}>
            <div>
              <dt className="t-hud">Email</dt>
              <dd>
                <CopyEmail big />
              </dd>
            </div>
            <div>
              <dt className="t-hud">Hyderabad, now</dt>
              <dd className={styles.clock}>
                <Clock />
              </dd>
            </div>
          </dl>
        </div>
        <div className={styles.phone}>
          <InteractivePhone flow={CONTACT_FLOW} active variant={small ? "frameless" : "device"} onField={onField} onOutcome={onOutcome} inject={inject} replay={false} label="Chat with Scyte" />
        </div>
      </section>

      <section className={styles.audit} aria-labelledby="audit-title">
        <h2 id="audit-title" className={styles.h2}>
          The 20-minute store audit
        </h2>
        <ol className={styles.steps}>
          {AUDIT.map((a, i) => (
            <li key={a.when}>
              <span className={styles.stepN}>{String(i + 1).padStart(2, "0")}</span>
              <span className={`${styles.stepWhen} t-hud`}>{a.when}</span>
              <p>{a.what}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.formWrap} aria-labelledby="form-title">
        <header className={styles.formHead}>
          <h2 id="form-title" className={styles.h3}>
            The form the chat is filling
          </h2>
          <p className="t-small c-muted">Works on its own too, with or without JavaScript.</p>
        </header>
        <form ref={form} action={action} className={styles.form} data-filled={filled ?? undefined} noValidate={false}>
          <fieldset className={styles.row}>
            <legend className="t-hud">What you need</legend>
            <div className={styles.choices}>
              {(["audit", "project"] as const).map((i) => (
                <label key={i} className={styles.choice}>
                  <input type="radio" name="intent" value={i} checked={values.intent === i} onChange={() => set("intent", i)} />
                  <span>{i === "audit" ? "A store audit" : "A studio project"}</span>
                </label>
              ))}
            </div>
            <label className={styles.field} data-hot={filled === "service" ? "1" : undefined}>
              <span className={styles.label}>Service</span>
              <select name="service" value={values.service} onChange={(e) => set("service", e.target.value as Values["service"])}>
                <option value="">Not sure yet</option>
                {SERVICE_IDS.map((s) => (
                  <option key={s} value={s}>
                    {SERVICE_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <div className={styles.grid}>
            <label className={styles.field} data-hot={filled === "store" ? "1" : undefined}>
              <span className={styles.label}>Store address {values.intent === "audit" ? "" : "(optional)"}</span>
              <input name="store" inputMode="url" autoComplete="url" placeholder="yourstore.in" value={values.store} onChange={(e) => set("store", e.target.value)} aria-invalid={!!errors.store} aria-describedby={errors.store ? `${uid}-store` : undefined} />
              {errors.store ? (
                <span id={`${uid}-store`} className={styles.error}>
                  {errors.store}
                </span>
              ) : null}
            </label>
            <label className={styles.field} data-hot={filled === "revenue" ? "1" : undefined}>
              <span className={styles.label}>Monthly revenue</span>
              <select name="revenue" value={values.revenue} onChange={(e) => set("revenue", e.target.value)}>
                <option value="">Choose a range</option>
                {REVENUE_RANGES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field} data-hot={filled === "name" ? "1" : undefined}>
              <span className={styles.label}>Your name</span>
              <input name="name" autoComplete="name" required value={values.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${uid}-name` : undefined} />
              {errors.name ? (
                <span id={`${uid}-name`} className={styles.error}>
                  {errors.name}
                </span>
              ) : null}
            </label>
            <label className={styles.field} data-hot={filled === "email" ? "1" : undefined}>
              <span className={styles.label}>Email</span>
              <input name="email" type="email" autoComplete="email" required value={values.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? `${uid}-email` : undefined} />
              {errors.email ? (
                <span id={`${uid}-email`} className={styles.error}>
                  {errors.email}
                </span>
              ) : null}
            </label>
          </div>

          <fieldset className={styles.row} data-hot={filled === "pains" ? "1" : undefined}>
            <legend className="t-hud">What hurts most</legend>
            <div className={styles.choices}>
              {PAINS.map((p) => (
                <label key={p} className={styles.choice}>
                  <input
                    type="checkbox"
                    name="pains"
                    value={p}
                    checked={values.pains.includes(p)}
                    onChange={(e) => set("pains", e.target.checked ? [...values.pains, p] : values.pains.filter((x) => x !== p))}
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className={styles.field} data-hot={filled === "message" ? "1" : undefined}>
            <span className={styles.label}>Anything else (optional)</span>
            <textarea name="message" rows={4} value={values.message} onChange={(e) => set("message", e.target.value)} />
          </label>

          {/* honeypot: hidden from people and from assistive technology */}
          <div className={styles.trap} aria-hidden="true">
            <label>
              Company
              <input name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          <div className={styles.submitRow}>
            <button type="submit" className={styles.submit} disabled={pending || sent} data-magnetic data-cursor="tap">
              {pending ? "Sending…" : sent ? "Sent" : "Send"}
            </button>
            <p className={styles.status} role="status" aria-live="polite">
              {state.status === "error" ? state.message : sent ? "In Scyte's inbox. Thank you." : ""}
            </p>
          </div>
          <p className={styles.privacy}>
            What you type stays on this page until you press Send. Then it goes to Scyte’s inbox and nowhere else. This site runs no
            analytics and no trackers.
          </p>
        </form>
      </section>
    </div>
  );
}
