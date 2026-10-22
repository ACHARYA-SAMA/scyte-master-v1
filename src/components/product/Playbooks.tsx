"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { PLAYBOOKS, type Playbook } from "@/data/playbooks";
import { scroller } from "@/components/providers/SmoothScroll";
import { ScrollTrigger, gsap, useGSAP, prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { Phone } from "./Phone";
import styles from "./Playbooks.module.css";

const N = PLAYBOOKS.length;

const CATEGORY: Record<Playbook["template"], string> = {
  utility: "Utility",
  marketing: "Marketing",
  "utility-then-marketing": "Utility, then marketing",
};

const ROUTES = [
  { reason: "upi_timeout", fix: "One-tap retry link" },
  { reason: "bank_decline", fix: "Switch to UPI" },
  { reason: "insufficient_funds", fix: "Offer cash on delivery" },
  { reason: "user_cancelled", fix: "Wait, then a single retry link" },
];

function Wedge({ p }: { p: Playbook }) {
  if (p.id === "payment-failed") {
    return (
      <div className={styles.wedge}>
        <p className={styles.wedgeTitle}>The gateway says why. We answer the reason, not the symptom.</p>
        <ul className={styles.routes}>
          {ROUTES.map((r) => (
            <li key={r.reason}>
              <code>{r.reason}</code>
              <span className={styles.arrow} aria-hidden />
              <span>{r.fix}</span>
            </li>
          ))}
        </ul>
        <p className={styles.fine}>Example routing. Rules are set per store and per gateway.</p>
      </div>
    );
  }
  return (
    <div className={styles.wedge}>
      <p className={styles.wedgeTitle}>Confirm before dispatch, so a refused parcel never leaves the warehouse.</p>
      <ul className={styles.routes}>
        <li>
          <code>Confirm</code>
          <span className={styles.arrow} aria-hidden />
          <span>Ship it</span>
        </li>
        <li>
          <code>Cancel</code>
          <span className={styles.arrow} aria-hidden />
          <span>No shipment, no return-to-origin</span>
        </li>
        <li>
          <code>No reply in 2 to 4 h</code>
          <span className={styles.arrow} aria-hidden />
          <span>One reminder</span>
        </li>
      </ul>
    </div>
  );
}

export function Playbooks() {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const [index, setIndex] = useState(0);
  const p = PLAYBOOKS[index];

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      let last = 0;
      st.current = ScrollTrigger.create({
        trigger: el.querySelector("[data-track]"),
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const i = Math.min(N - 1, Math.floor(self.progress * N));
          if (i !== last) {
            last = i;
            setIndex(i);
            sfx.lock();
          }
        },
      });
    },
    { scope: root },
  );

  // Move the list so the selected item sits inside the lens.
  useGSAP(
    () => {
      const l = list.current;
      if (!l) return;
      const item = l.querySelector<HTMLElement>(`[data-i="${index}"]`);
      if (!item) return;
      const lens = l.parentElement!.getBoundingClientRect();
      const y = -(item.offsetTop + item.offsetHeight / 2 - lens.height / 2);
      const d = prefersReducedMotion() ? 0 : 0.6;
      gsap.to(l, { y, duration: d, ease: "latch", overwrite: true });
      // the lens clamps to the height of whatever it has locked onto
      gsap.to(root.current!.querySelector("[data-lens]"), { height: item.offsetHeight + 10, duration: d, ease: "latch" });
      if (!prefersReducedMotion()) {
        gsap.fromTo(
          root.current!.querySelectorAll("[data-detail] > *"),
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45, ease: "glide", stagger: 0.04, overwrite: true },
        );
      }
    },
    { dependencies: [index], scope: root },
  );

  const select = (i: number) => {
    const t = st.current;
    if (!t) return setIndex(i);
    const y = t.start + ((t.end - t.start) * (i + 0.5)) / N;
    if (scroller.lenis) scroller.lenis.scrollTo(y, { duration: 0.9 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      select(Math.min(N - 1, index + 1));
    }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      select(Math.max(0, index - 1));
    }
  };

  return (
    <section ref={root} className={styles.section} aria-labelledby="playbooks-title">
      <div className={styles.track} data-track>
        <div className={styles.sticky}>
          <h2 id="playbooks-title" className={styles.heading}>
            Ten playbooks. Two of them pay for the rest.
          </h2>

          <div className={styles.lensCol}>
            <div className={styles.lens} data-lens aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className={styles.listWindow}>
              <div
                ref={list}
                className={styles.list}
                role="tablist"
                aria-orientation="vertical"
                aria-label="Playbooks"
                onKeyDown={onKey}
              >
                {PLAYBOOKS.map((pb, i) => (
                  <button
                    key={pb.id}
                    type="button"
                    role="tab"
                    id={`pb-tab-${pb.id}`}
                    aria-selected={i === index}
                    aria-controls="pb-panel"
                    tabIndex={i === index ? 0 : -1}
                    data-i={i}
                    data-weight={pb.weight}
                    className={styles.item}
                    onClick={() => select(i)}
                  >
                    <span className={styles.itemName}>{pb.name}</span>
                    {pb.weight === "wedge" ? <span className={styles.badge}>The wedge</span> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className={styles.detail}
            id="pb-panel"
            role="tabpanel"
            aria-labelledby={`pb-tab-${p.id}`}
            data-detail
            data-weight={p.weight}
          >
            <h3 className={styles.name}>{p.name}</h3>
            <p className={styles.line}>{p.line}</p>
            <dl className={styles.facts}>
              <div>
                <dt>Trigger</dt>
                <dd>{p.trigger}</dd>
              </div>
              <div>
                <dt>Timing</dt>
                <dd>{p.timing}</dd>
              </div>
              <div>
                <dt>Template</dt>
                <dd>{CATEGORY[p.template]}</dd>
              </div>
              <div>
                <dt>Goal metric</dt>
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
            {p.weight === "wedge" ? <Wedge p={p} /> : null}
          </div>

          <div className={styles.phone}>
            <Phone
              brand="Your store"
              time="15:05"
              label={`Sample ${p.name} message`}
              messages={[
                { id: "d", from: "system", text: "Today" },
                { id: p.id, from: "brand", tag: CATEGORY[p.template], text: p.message, time: "15:05", buttons: p.buttons },
              ]}
            />
            <p className={styles.fine}>Sample copy. Variables in braces fill from the shopper&rsquo;s own data.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
