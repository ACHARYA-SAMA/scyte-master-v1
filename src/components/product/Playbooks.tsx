"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PLAYBOOKS, type Playbook } from "@/data/playbooks";
import { InteractivePhone } from "@/components/devices/InteractivePhone";
import { ScrollRail, type RailGroup } from "@/components/kit/ScrollRail";
import { FLAP_CHARS } from "@/components/kit/SplitFlapBoard";
import { scrollToY } from "@/components/providers/SmoothScroll";
import { SHOPPER_FLOWS, templateFlow } from "@/lib/chat/flows";
import type { Flow } from "@/lib/chat/types";
import { gsap, prefersReducedMotion, ScrollTrigger } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import styles from "./Playbooks.module.css";

const CATEGORY: Record<Playbook["template"], string> = {
  utility: "Utility",
  marketing: "Marketing",
  "utility-then-marketing": "Utility, then marketing",
};

/** Playbooks with a full conversation on the site run it; the rest run their template. */
const FLOWS: Partial<Record<string, Flow>> = {
  "payment-failed": SHOPPER_FLOWS.PAYMENT_FAILED,
  "cod-confirmation": SHOPPER_FLOWS.COD_CONFIRM,
  "cart-recovery": SHOPPER_FLOWS.CART_RECOVERY,
  "back-in-stock": SHOPPER_FLOWS.BACK_IN_STOCK,
  "post-purchase": SHOPPER_FLOWS.TRACKING,
  "review-request": SHOPPER_FLOWS.REVIEW,
};
const flowFor = (p: Playbook) => FLOWS[p.id] ?? templateFlow(p);

const GROUPS: { weight: Playbook["weight"]; title: string }[] = [
  { weight: "wedge", title: "Where the money is" },
  { weight: "core", title: "Recovery" },
  { weight: "lifecycle", title: "After the order" },
];

/** The word behind each playbook: what it does, in one verb or noun. */
const WORD: Record<string, string> = {
  "payment-failed": "Retry",
  "cod-confirmation": "Confirm",
  "checkout-recovery": "Finish",
  "cart-recovery": "Nudge",
  "browse-abandonment": "Intent",
  "back-in-stock": "Restock",
  "post-purchase": "Tracked",
  "review-request": "Review",
  reorder: "Refill",
  "win-back": "Return",
};

const ROUTES: Record<string, { when: string; then: string }[]> = {
  "payment-failed": [
    { when: "upi_timeout", then: "One-tap retry link" },
    { when: "bank_decline", then: "Switch to another UPI app or card" },
    { when: "insufficient_funds", then: "Offer cash on delivery" },
    { when: "user_cancelled", then: "Wait, then a single retry link" },
  ],
  "cod-confirmation": [
    { when: "Confirm", then: "Release for dispatch" },
    { when: "Cancel", then: "No shipment, no return trip" },
    { when: "No reply in 2 to 4 h", then: "One reminder" },
  ],
};

const ORDERED = GROUPS.flatMap((g) => PLAYBOOKS.filter((p) => p.weight === g.weight));
const N = ORDERED.length;
const RAIL: RailGroup[] = GROUPS.map((g) => ({ title: g.title, items: ORDERED.filter((p) => p.weight === g.weight).map((p) => ({ id: p.id, label: p.name, detail: p.goal })) }));
/** Each playbook gets this much scroll, in viewport heights. */
const PER = 0.72;

/** Text that resolves out of the split-flap alphabet when it changes, like a board settling. */
function Scramble({ text }: { text: string }) {
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (prefersReducedMotion()) {
      node.textContent = text;
      return;
    }
    const chars = FLAP_CHARS.replace(" ", "");
    const start = performance.now();
    const dur = 420 + text.length * 14;
    let raf = 0;
    const step = () => {
      const t = (performance.now() - start) / dur;
      const fixed = Math.floor(Math.min(1, t) * text.length);
      let out = text.slice(0, fixed);
      for (let i = fixed; i < text.length; i++) out += text[i] === " " ? " " : chars[(Math.random() * chars.length) | 0];
      node.textContent = out;
      if (t < 1) raf = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(raf);
  }, [text]);
  return (
    <>
      {/* the drum owns this node's text; React never renders into it */}
      <span ref={el} aria-hidden />
      <span className="sr-only">{text}</span>
    </>
  );
}

/** The template as a spec, for the phone-width list. */
function Template({ p }: { p: Playbook }) {
  const parts = p.message.split(/(\{[a-z]+\})/g);
  return (
    <figure className={styles.template}>
      <figcaption className="t-hud">Template, {CATEGORY[p.template].toLowerCase()}</figcaption>
      <p className={styles.message}>
        {parts.map((part, i) =>
          /^\{[a-z]+\}$/.test(part) ? (
            <mark key={i} className={styles.var}>
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
      {p.buttons.length ? (
        <ul className={styles.buttons}>
          {p.buttons.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}

/**
 * P9, the playbooks as a scroll-through: pinned, one stretch of scroll per playbook.
 * The rail on the left follows the scroll and fills as you go; the centre sets each
 * playbook's name, line, facts and event chain; the phone on the right runs it, and
 * stays live the whole way. Clicking a rail item scrolls to that playbook.
 */
export function Playbooks() {
  const root = useRef<HTMLElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const p = ORDERED[index]!;
  const group = GROUPS.find((g) => g.weight === p.weight)!;
  const routes = ROUTES[p.id];

  // the scroll decides the playbook; the local progress through it is a CSS variable
  useEffect(() => {
    const el = root.current;
    const st = sticky.current;
    if (!el || !st) return;
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const raw = Math.min(N - 0.0001, self.progress * N);
        const i = Math.floor(raw);
        st.style.setProperty("--local", (raw - i).toFixed(4));
        st.style.setProperty("--p", self.progress.toFixed(4));
        setIndex((cur) => (cur === i ? cur : i));
      },
    });
    return () => trigger.kill();
  }, []);

  // each new playbook: the name rises out of its mask, the rest follows
  useEffect(() => {
    const c = copy.current;
    if (!c || prefersReducedMotion()) return;
    sfx.lock();
    const tl = gsap.timeline();
    tl.fromTo(c.querySelectorAll("[data-mask] > span"), { yPercent: 105 }, { yPercent: 0, duration: 0.62, ease: "glide", stagger: 0.06 }, 0);
    tl.fromTo(c.querySelectorAll("[data-rise]"), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "glide", stagger: 0.05 }, 0.12);
    return () => {
      tl.kill();
    };
  }, [index]);

  // the phone follows a beat behind, so a fast scroll does not restart it ten times;
  // the old conversation flies out before the new one arrives
  useEffect(() => {
    if (shown === index) return;
    const t = window.setTimeout(() => {
      const log = phone.current?.querySelector("ol");
      if (!log || prefersReducedMotion()) {
        setShown(index);
        return;
      }
      gsap.to(log, { y: -60, opacity: 0, duration: 0.26, ease: "cut", onComplete: () => setShown(index) });
    }, 240);
    return () => window.clearTimeout(t);
  }, [index, shown]);

  const select = (i: number) => {
    const el = root.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    scrollToY(top + ((i + 0.04) / N) * travel, 0.9 + Math.abs(i - index) * 0.08);
  };

  const live = ORDERED[shown]!;
  const words = p.name.split(" ");

  return (
    <section ref={root} id="playbooks" className={styles.section} aria-labelledby="playbooks-title" style={{ "--n": N, "--per": `${PER * 100}svh` } as CSSProperties}>
      <div ref={sticky} className={styles.sticky} data-weight={p.weight} data-motion-own>
        <span className={styles.ghost} aria-hidden key={p.id}>
          {WORD[p.id]}
        </span>
        <header className={styles.head}>
          <p className={`${styles.kicker} t-hud`}>Playbooks</p>
          <h2 id="playbooks-title" className={styles.title}>
            Ten playbooks. Two of them pay for the rest.
          </h2>
        </header>

        <ScrollRail label="Playbooks" groups={RAIL} active={index} onSelect={select} className={styles.rail} />

        <div ref={copy} className={styles.detail} aria-live="polite">
          <p className={`${styles.count} t-hud`} data-rise>
            <span className={styles.countNow}>{String(index + 1).padStart(2, "0")}</span> / {N}
            <span className={styles.groupName}>{group.title}</span>
          </p>
          <h3 className={styles.name} aria-label={p.name}>
            {words.map((w, i) => (
              <span key={`${p.id}-${i}`} className={styles.mask} data-mask aria-hidden>
                <span>{w}</span>
              </span>
            ))}
          </h3>
          <p className={styles.line} data-rise>
            {p.line}
          </p>
          <dl className={styles.spec} data-rise>
            <div>
              <dt className="t-hud">Trigger</dt>
              <dd>
                <Scramble text={p.trigger} />
              </dd>
            </div>
            <div>
              <dt className="t-hud">Timing</dt>
              <dd>
                <Scramble text={p.timing} />
              </dd>
            </div>
            <div>
              <dt className="t-hud">Category</dt>
              <dd>
                <Scramble text={CATEGORY[p.template]} />
              </dd>
            </div>
            <div>
              <dt className="t-hud">Measured by</dt>
              <dd>
                <Scramble text={p.goal} />
              </dd>
            </div>
          </dl>
          {/* the event chain draws itself as you scroll through the playbook */}
          <ol className={styles.chain} aria-label="Event chain" data-rise style={{ "--m": p.events.length } as CSSProperties}>
            <span className={styles.wire} aria-hidden>
              <span />
            </span>
            {p.events.map((e, k) => (
              <li key={`${p.id}-${e}`} style={{ "--k": k } as CSSProperties}>
                <code>{e}</code>
              </li>
            ))}
          </ol>
          {routes ? (
            <div className={styles.routes} data-rise>
              <p className="t-hud">Routing, by example</p>
              <ul>
                {routes.map((r) => (
                  <li key={r.when}>
                    <code>{r.when}</code>
                    <span>{r.then}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div ref={phone} className={styles.device}>
          <InteractivePhone key={live.id} flow={flowFor(live)} active label={`Demo chat: ${live.name}`} />
        </div>

        <div className={styles.progress} aria-hidden>
          <span />
        </div>
      </div>

      {/* phones: one column, every playbook in order, no pin */}
      <ol className={styles.list}>
        {ORDERED.map((x, i) => (
          <li key={x.id} className={styles.listItem}>
            <p className="t-hud c-khaki">
              {String(i + 1).padStart(2, "0")} / {N}, {GROUPS.find((g) => g.weight === x.weight)!.title}
            </p>
            <h3 className={styles.listName}>{x.name}</h3>
            <p className={styles.line}>{x.line}</p>
            <p className={`${styles.listFacts} t-small`}>
              {x.trigger}. {x.timing}. {CATEGORY[x.template]}. Measured by {x.goal.toLowerCase()}.
            </p>
            <Template p={x} />
          </li>
        ))}
      </ol>
    </section>
  );
}
