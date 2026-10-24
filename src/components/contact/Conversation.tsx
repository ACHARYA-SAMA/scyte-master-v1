"use client";

import { Suspense, useActionState, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { submitContact } from "@/app/contact/actions";
import { PAINS, REVENUE_RANGES, SERVICE_IDS, type ContactState } from "@/lib/contact-schema";
import { contactFlow, type ContactIntent, type ContactLang } from "@/lib/chat/contactFlow";
import { InteractivePhone } from "@/components/devices/InteractivePhone";
import { CopyEmail } from "@/components/shell/CopyEmail";
import { Clock } from "@/components/nav/Nav";
import { session, toast, useStore } from "@/lib/store";
import { getVolume, setVolume, sfx } from "@/lib/sound";
import { awardStamp } from "@/lib/stamps";
import { RotaryKnob } from "@/components/kit/RotaryKnob";
import { HoldToConfirm } from "@/components/kit/HoldToConfirm";
import { ReceiptPrinter, type ReceiptLine } from "@/components/kit/ReceiptPrinter";
import { TransitionLink } from "@/components/transition/navigation";
import { Intents } from "./Intents";
import { AuditThrough } from "./AuditThrough";
import { HyderabadMap } from "./HyderabadMap";
import { ContactFaq } from "./ContactFaq";
import { PlayLogo } from "./PlayLogo";
import { track } from "@/lib/analytics";
import { useMedia } from "@/lib/useMedia";
import { SITE } from "@/config/site";
import { LetsTalk } from "./LetsTalk";
import styles from "./Conversation.module.css";

type Values = {
  intent: "audit" | "project" | "pilot";
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

const LANGS: { id: ContactLang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिन्दी" },
  { id: "te", label: "తెలుగు" },
  { id: "hinglish", label: "Hinglish" },
];

const INTENT_LABEL: Record<Values["intent"], string> = { audit: "20-minute store audit", project: "Studio project", pilot: "30-day pilot" };
const NEXT: Record<Values["intent"], string[]> = {
  audit: ["We look at the store as a shopper", "We write to book the call", "A summary follows the call"],
  project: ["We read the brief", "We write to book a call", "A written scope follows"],
  pilot: ["We look at the store first", "A call to agree the playbooks and the number", "Nothing is sent before that"],
};

/** A reference a person can quote: the date in Hyderabad and four random letters. */
const makeRef = () => {
  const d = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "2-digit", month: "2-digit", day: "2-digit" }).format(new Date()).split("/").reverse().join("");
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `SC-${d}-${Array.from({ length: 4 }, () => a[(Math.random() * a.length) | 0]).join("")}`;
};

/** Contact as a conversation, over a real form that works without the chat. */
export function Conversation() {
  const uid = useId();
  const [intent, setIntent] = useState<ContactIntent | null>(null);
  const [lang, setLang] = useState(0);
  const [vol, setVol] = useState(70);
  const [hydrated, setHydrated] = useState(false);
  const [ref, setRef] = useState("");
  const [preview, setPreview] = useState(0);
  const recovered = useStore(session, (s) => s.recovered);
  const flow = useMemo(() => contactFlow(intent, LANGS[lang]!.id), [intent, lang]);
  const [values, setValues] = useState<Values>(EMPTY);
  const [filled, setFilled] = useState<string | null>(null);
  const [state, action, pending] = useActionState(submitContact, initial);
  const [inject, setInject] = useState<{ id: number; text: string; end?: boolean } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const viaChat = useRef(false);
  const small = useMedia("(max-width: 640px)");

  // ?intent=audit|pilot or ?service=website from the rest of the site
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const service = q.get("service");
    const wanted = q.get("intent");
    // the query, the volume and the reference are only known in the browser, after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
    setVol(Math.round(getVolume() * 100));
    setRef(makeRef());
    if (service && (SERVICE_IDS as readonly string[]).includes(service)) {
      setValues((v) => ({ ...v, intent: service === "recovery" ? "audit" : "project", service: service as Values["service"] }));
      setIntent(service === "recovery" ? "audit" : "project");
    } else if (wanted === "audit" || wanted === "pilot") {
      setValues((v) => ({ ...v, intent: wanted, service: "recovery" }));
      setIntent(wanted);
    }
  }, []);

  const pickIntent = (i: ContactIntent) => {
    setIntent(i);
    setValues((v) => ({ ...v, intent: i, service: i === "project" ? (v.service === "recovery" ? "" : v.service) : "recovery" }));
    sfx.clink();
  };

  // the server's answer, said by the phone as well as the form
  useEffect(() => {
    if (state.status === "sent") {
      sfx.ok();
      track("contact_sent", { intent: state.intent, via: viaChat.current ? "chat" : "form" });
      toast("Sent. It is in Scyte's inbox.", "ok");
      awardStamp("correspondent");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the reply follows the server, not a render
      setInject({
        id: Date.now(),
        text: `Sent. Thanks${state.name ? `, ${state.name}` : ""}. We will write back from ${SITE.email}${state.intent === "project" ? "" : ", after we have looked at the store"}.`,
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
      if (name === "intent") {
        setIntent(value as ContactIntent);
        return { ...v, intent: value as Values["intent"] };
      }
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

  // K3: the receipt, previewed from the form before it goes, printed for real once it has
  const draft: ReceiptLine[] = [
    { kind: "title", text: "Before it goes" },
    { kind: "row", left: "Need", right: INTENT_LABEL[values.intent] },
    { kind: "row", left: "Service", right: values.service ? SERVICE_LABEL[values.service] : "Not sure yet" },
    { kind: "row", left: "Store", right: values.store || "None given" },
    { kind: "row", left: "Revenue", right: values.revenue || "Not given" },
    { kind: "row", left: "Hurts most", right: values.pains.join(", ") || "Not given" },
    { kind: "row", left: "Name", right: values.name || "Missing" },
    { kind: "row", left: "Email", right: values.email || "Missing" },
    { kind: "rule" },
    { kind: "row", left: "Nothing has left this page yet." },
  ];
  const confirmation: ReceiptLine[] = [
    { kind: "title", text: "Received" },
    { kind: "row", left: "Reference", right: ref || "on the email", strong: true },
    { kind: "row", left: "For", right: INTENT_LABEL[values.intent] },
    { kind: "row", left: "Sent to", right: SITE.email },
    { kind: "rule" },
    ...NEXT[values.intent].map((n, i) => ({ kind: "row" as const, left: `${i + 1}. ${n}` })),
    { kind: "rule" },
    { kind: "total", left: "Reply from", right: SITE.email },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.top} aria-labelledby="contact-title">
        <div className={styles.left}>
          <p className="t-hud c-khaki" id="contact-title">
            Contact
          </p>
          <LetsTalk />
          <p className={styles.lede}>Talk to us the way your customers will talk to you: on a chat. Or use the form under it; it is the same thing.</p>
          <Intents value={intent} onChange={pickIntent} />
          <div className={styles.dials}>
            <RotaryKnob label="Greeting in" value={lang} min={0} max={LANGS.length - 1} step={1} ticks={LANGS.length} onChange={(v) => setLang(v)} format={(v) => LANGS[v]!.label} size="s" />
            <RotaryKnob
              label="Volume"
              value={vol}
              min={0}
              max={100}
              step={5}
              onChange={(v) => {
                setVol(v);
                setVolume(v / 100);
                sfx.tick();
              }}
              format={(v) => `${v} %`}
              hint="Sound on in the menu"
              size="s"
            />
            <dl className={styles.facts}>
              <div>
                <dt className="t-hud">Email</dt>
                <dd>
                  <CopyEmail />
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
          <p className={`${styles.langNote} t-small`}>{lang ? "The greeting changes; the rest of the chat is in English for now." : "Turn the dial to be greeted in Hindi, Telugu or Hinglish."}</p>
        </div>
        <div className={styles.phone} data-avoid>
          {/* the phone, the steps and the form hydrate as separate boundaries, not one long task */}
          <Suspense fallback={null}>
            <InteractivePhone key={flow.id} flow={flow} active variant={small ? "frameless" : "device"} onField={onField} onOutcome={onOutcome} inject={inject} replay={false} label="Chat with Scyte" />
          </Suspense>
        </div>
      </section>

      <AuditThrough />

      <Suspense fallback={null}>
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
                {(["audit", "project", "pilot"] as const).map((i) => (
                  <label key={i} className={styles.choice}>
                    <input
                      type="radio"
                      name="intent"
                      value={i}
                      checked={values.intent === i}
                      onChange={() => {
                        set("intent", i);
                        setIntent(i);
                      }}
                    />
                    <span>{i === "audit" ? "A store audit" : i === "project" ? "A studio project" : "A 30-day pilot"}</span>
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
                <span className={styles.label}>Store address {values.intent === "project" ? "(optional)" : ""}</span>
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

            <input type="hidden" name="ref" value={ref} />
            {/* honeypot: hidden from people and from assistive technology */}
            <div className={styles.trap} aria-hidden="true">
              <label>
                Company
                <input name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
              </label>
            </div>

            <div className={styles.submitRow}>
              {hydrated ? (
                <HoldToConfirm onConfirm={() => form.current?.requestSubmit()} disabled={pending || sent} doneLabel={sent ? "Sent" : "Sending"} size="l">
                  {pending ? "Sending…" : sent ? "Sent" : "Hold to send"}
                </HoldToConfirm>
              ) : (
                <button type="submit" className={`${styles.submit} cta`} disabled={pending || sent} data-glow data-magnetic data-cursor="tap">
                  {pending ? "Sending…" : sent ? "Sent" : "Send"}
                </button>
              )}
              <button type="button" className={styles.preview} onClick={() => setPreview((n) => n + 1)} disabled={sent}>
                Preview the receipt
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
          <aside className={styles.receiptCol} aria-label="Receipt" data-avoid>
            <ReceiptPrinter
              label={sent ? "Received" : "Preview"}
              lines={sent ? confirmation : draft}
              printId={sent ? 999 : preview}
              idleText="Preview prints what will be sent"
            />
            {sent ? (
              <div className={styles.success}>
                <p className={styles.successTitle}>It is in our inbox.</p>
                <p className="t-small">
                  Reference <b className="t-num">{ref || "on the email"}</b>. Orders you recovered on this visit: <b className="t-num">{recovered}</b>. A stamp landed in your passport.
                </p>
                <div className={styles.successLinks}>
                  <TransitionLink href="/" className="cta" data-magnetic>
                    Back into the story
                  </TransitionLink>
                  <TransitionLink href="/product" className={styles.quiet}>
                    See the machine
                  </TransitionLink>
                </div>
              </div>
            ) : null}
          </aside>
        </section>
      </Suspense>

      <HyderabadMap />
      <ContactFaq />
      <PlayLogo />
    </div>
  );
}
