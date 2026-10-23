"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { PLAYBOOKS, type Playbook } from "@/data/playbooks";
import { InteractivePhone } from "@/components/devices/InteractivePhone";
import { SHOPPER_FLOWS } from "@/lib/chat/flows";
import type { Flow } from "@/lib/chat/types";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import styles from "./Playbooks.module.css";

const CATEGORY: Record<Playbook["template"], string> = {
  utility: "Utility",
  marketing: "Marketing",
  "utility-then-marketing": "Utility, then marketing",
};

/** Playbooks that have a working flow on the site run in a phone; the rest show their template. */
const FLOWS: Partial<Record<string, Flow>> = {
  "payment-failed": SHOPPER_FLOWS.PAYMENT_FAILED,
  "cod-confirmation": SHOPPER_FLOWS.COD_CONFIRM,
  "cart-recovery": SHOPPER_FLOWS.CART_RECOVERY,
  "checkout-recovery": SHOPPER_FLOWS.CART_RECOVERY,
  "back-in-stock": SHOPPER_FLOWS.BACK_IN_STOCK,
  "post-purchase": SHOPPER_FLOWS.TRACKING,
  "review-request": SHOPPER_FLOWS.REVIEW,
};

const GROUPS: { weight: Playbook["weight"]; title: string }[] = [
  { weight: "wedge", title: "Where the money is" },
  { weight: "core", title: "Recovery" },
  { weight: "lifecycle", title: "After the order" },
];

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

/** The template as a spec: variables marked, buttons listed. */
function Template({ p }: { p: Playbook }) {
  const parts = p.message.split(/(\{[a-z]+\})/g);
  return (
    <figure className={styles.template} data-tilt>
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
 * Ten playbooks as a navigable system: grouped by where the money is, the two wedges
 * first and largest. Arrow keys move through them; the selected one opens its trigger,
 * timing, goal, event chain and a working phone where the site has one.
 */
export function Playbooks() {
  const tabsId = useId();
  const root = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const ordered = GROUPS.flatMap((g) => PLAYBOOKS.filter((p) => p.weight === g.weight));
  const p = ordered[index];
  const flow = FLOWS[p.id];
  const routes = ROUTES[p.id];

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(root.current!.querySelectorAll("[data-detail] > *"), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "glide", stagger: 0.05, overwrite: true });
    },
    { dependencies: [index], scope: root },
  );

  const select = (i: number) => {
    setIndex(i);
    sfx.lock();
  };

  const onKey = (e: KeyboardEvent) => {
    const next = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!next) return;
    e.preventDefault();
    const i = (index + next + ordered.length) % ordered.length;
    select(i);
    root.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.focus();
  };

  const indexOf = new Map(ordered.map((x, i) => [x.id, i]));

  return (
    <section ref={root} id="playbooks" className={styles.section} aria-labelledby="playbooks-title">
      <header className={styles.head}>
        <p className="t-hud c-khaki">Playbooks</p>
        <h2 id="playbooks-title" className={styles.title}>
          Ten playbooks. Two of them pay for the rest.
        </h2>
        <p className={styles.lede}>
          Payment failures and cash on delivery are where Indian stores lose the most, and where generic tools are thinnest. They get
          the most room here, and in a pilot.
        </p>
      </header>

      <div className={styles.grid}>
        <div className={styles.list} role="tablist" aria-orientation="vertical" aria-label="Playbooks" onKeyDown={onKey}>
          {GROUPS.map((g) => (
            <div key={g.weight} className={styles.group} data-weight={g.weight}>
              <p className={`${styles.groupTitle} t-hud`}>{g.title}</p>
              {PLAYBOOKS.filter((x) => x.weight === g.weight).map((x) => {
                const i = indexOf.get(x.id) ?? 0;
                const on = i === index;
                return (
                  <button
                    key={x.id}
                    type="button"
                    role="tab"
                    id={`${tabsId}-${x.id}`}
                    aria-selected={on}
                    aria-controls={`${tabsId}-panel`}
                    tabIndex={on ? 0 : -1}
                    data-i={i}
                    className={styles.tab}
                    data-weight={x.weight}
                    onClick={() => select(i)}
                    data-cursor="open"
                  >
                    <span className={styles.tabName}>{x.name}</span>
                    <span className={`${styles.tabGoal} t-hud`}>{x.goal}</span>
                    {on ? <span className={styles.lens} aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${p.id}`} className={styles.detail} data-detail>
          <h3 className={styles.name}>{p.name}</h3>
          <p className={styles.line}>{p.line}</p>
          <dl className={styles.spec}>
            <div>
              <dt className="t-hud">Trigger</dt>
              <dd>{p.trigger}</dd>
            </div>
            <div>
              <dt className="t-hud">Timing</dt>
              <dd>{p.timing}</dd>
            </div>
            <div>
              <dt className="t-hud">Category</dt>
              <dd>{CATEGORY[p.template]}</dd>
            </div>
            <div>
              <dt className="t-hud">Measured by</dt>
              <dd>{p.goal}</dd>
            </div>
          </dl>
          <ol className={styles.chain} aria-label="Event chain">
            {p.events.map((e) => (
              <li key={e}>
                <code>{e}</code>
              </li>
            ))}
          </ol>
          {routes ? (
            <table className={styles.routes}>
              <caption className="t-hud">Routing, by example</caption>
              <tbody>
                {routes.map((r) => (
                  <tr key={r.when}>
                    <th scope="row">
                      <code>{r.when}</code>
                    </th>
                    <td>{r.then}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        <div className={styles.device}>
          {flow ? (
            <InteractivePhone key={p.id} flow={flow} active label={`Demo chat: ${p.name}`} />
          ) : (
            <Template p={p} />
          )}
        </div>
      </div>
    </section>
  );
}
