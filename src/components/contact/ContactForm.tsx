"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitContact } from "@/app/contact/actions";
import { PAINS, REVENUE_RANGES, contactSchema, type ContactState } from "@/lib/contact-schema";
import { emit } from "@/lib/telemetry";
import { track } from "@/lib/analytics";
import { sfx } from "@/lib/sound";
import { SITE } from "@/config/site";
import styles from "./ContactForm.module.css";

type Intent = "audit" | "project";
const initial: ContactState = { status: "idle" };

export function ContactForm() {
  const [intent, setIntent] = useState<Intent>("audit");
  const [state, action, pending] = useActionState(submitContact, initial);
  const [local, setLocal] = useState<Record<string, string>>({});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // The URL hash is only known in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.location.hash === "#project") setIntent("project");
  }, []);

  useEffect(() => {
    if (state.status === "sent") {
      sfx.ok();
      track("contact_sent", { intent: state.intent });
    }
    if (state.status === "error") sfx.deny();
  }, [state]);

  const errors = { ...(state.status === "error" ? state.fields : {}), ...local };

  // Instant feedback on blur, with the same schema the server uses.
  const check = (field: string) => {
    const f = form.current;
    if (!f) return;
    const data = new FormData(f);
    const result = contactSchema.safeParse({
      intent,
      name: data.get("name"),
      email: data.get("email"),
      store: data.get("store") ?? "",
      revenue: data.get("revenue") || undefined,
      pains: data.getAll("pains"),
      message: data.get("message") ?? "",
    });
    const issue = result.success ? undefined : result.error.issues.find((i) => i.path[0] === field);
    setLocal((l) => {
      const next = { ...l };
      if (issue) next[field] = issue.message;
      else delete next[field];
      return next;
    });
  };

  if (state.status === "sent") {
    return (
      <div className={styles.sent} role="status">
        <p className={styles.sentKicker}>Received</p>
        <p className={styles.sentTitle}>
          {state.name ? `Thanks, ${state.name}.` : "Thanks."}{" "}
          {state.intent === "audit"
            ? "We will look at your store before we write back, and suggest a time for the 20 minutes."
            : "We will reply with a few questions and a time to talk."}
        </p>
        <p className={styles.sentNote}>
          Anything to add? Write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={form}
      action={action}
      className={styles.form}
      noValidate
      onSubmit={() => {
        emit("click", { detail: `contact_submit_${intent}` });
        track("contact_submit", { intent });
      }}
      aria-describedby={state.status === "error" ? "form-error" : undefined}
    >
      <input type="hidden" name="intent" value={intent} />

      <fieldset className={styles.intents}>
        <legend className="sr-only">What do you need?</legend>
        <label className={styles.intent} data-on={intent === "audit" ? "1" : undefined}>
          <input type="radio" name="_intent" checked={intent === "audit"} onChange={() => setIntent("audit")} />
          <span className={styles.intentName}>A 20-minute store audit</span>
          <span className={styles.intentNote}>For online brands. We study your checkout, payments and COD before the call.</span>
        </label>
        <label className={styles.intent} data-on={intent === "project" ? "1" : undefined}>
          <input type="radio" name="_intent" checked={intent === "project"} onChange={() => setIntent("project")} />
          <span className={styles.intentName}>A studio project</span>
          <span className={styles.intentNote}>A website, an app or your social media.</span>
        </label>
      </fieldset>

      <div className={styles.grid}>
        <div className={styles.field} data-error={errors.name ? "1" : undefined}>
          <label htmlFor="c-name">Your name</label>
          <input id="c-name" name="name" autoComplete="name" required onBlur={() => check("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "e-name" : undefined} />
          {errors.name ? <p id="e-name" className={styles.error}>{errors.name}</p> : null}
        </div>

        <div className={styles.field} data-error={errors.email ? "1" : undefined}>
          <label htmlFor="c-email">Email</label>
          <input id="c-email" name="email" type="email" autoComplete="email" inputMode="email" required onBlur={() => check("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "e-email" : undefined} />
          {errors.email ? <p id="e-email" className={styles.error}>{errors.email}</p> : null}
        </div>

        <div className={styles.field} data-error={errors.store ? "1" : undefined}>
          <label htmlFor="c-store">
            Store address {intent === "project" ? <span className={styles.opt}>if you have one</span> : null}
          </label>
          <input id="c-store" name="store" inputMode="url" autoComplete="url" placeholder="yourstore.in" onBlur={() => check("store")} aria-invalid={!!errors.store} aria-describedby={errors.store ? "e-store" : undefined} />
          {errors.store ? <p id="e-store" className={styles.error}>{errors.store}</p> : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="c-revenue">
            Monthly revenue <span className={styles.opt}>optional</span>
          </label>
          <select id="c-revenue" name="revenue" defaultValue="">
            <option value="">Choose a range</option>
            {REVENUE_RANGES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className={styles.pains}>
        <legend>What hurts most</legend>
        <div className={styles.chips}>
          {PAINS.map((p) => (
            <label key={p} className={styles.chip}>
              <input type="checkbox" name="pains" value={p} />
              <span>{p}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor="c-message">
          Anything else <span className={styles.opt}>optional</span>
        </label>
        <textarea id="c-message" name="message" rows={4} maxLength={2000} />
      </div>

      <div className={styles.honey} aria-hidden>
        <label htmlFor="c-company">Company</label>
        <input id="c-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={styles.submitRow}>
        <button type="submit" className={styles.submit} disabled={pending} data-magnetic="0.15">
          <span>{pending ? "Sending" : intent === "audit" ? "Request the audit" : "Send the brief"}</span>
          <i aria-hidden data-pending={pending ? "1" : undefined} />
        </button>
        <p className={styles.privacy}>
          We use this only to reply. Nothing is added to a mailing list.
        </p>
      </div>

      {state.status === "error" ? (
        <p id="form-error" className={styles.formError} role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
