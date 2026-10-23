"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger } from "@/lib/motion";
import { useAttract } from "@/lib/idle";
import { ToggleSwitch } from "@/components/kit/ToggleSwitch";
import styles from "./anatomy.module.css";

type Part = "header" | "body" | "vars" | "footer" | "buttons" | "category";

const NOTES: Record<Part, { title: string; utility: string; marketing: string }> = {
  header: {
    title: "Header",
    utility: "Optional. Text or a picture of the item, approved with the template.",
    marketing: "Optional. A picture of the item sells it better than a word.",
  },
  body: {
    title: "Body",
    utility: "Fixed wording, approved by Meta before it can ever be sent.",
    marketing: "Fixed wording, approved before use. The tone is the brand's, the rules are Meta's.",
  },
  vars: {
    title: "Variables",
    utility: "The only parts that change per shopper: name, amount, order.",
    marketing: "The only parts that change per shopper: name, item, how long it is held.",
  },
  footer: {
    title: "Footer",
    utility: "Optional on a utility message.",
    marketing: "How to opt out, every time. STOP is honoured at once.",
  },
  buttons: {
    title: "Buttons",
    utility: "Up to three: retry, another method, cash on delivery.",
    marketing: "A link back to the saved cart, and a way to say not now.",
  },
  category: {
    title: "Category",
    utility: "Utility: about an order they already placed. Charged at the lower per-message rate. Check current rates.",
    marketing: "Marketing: an offer or a reminder. Needs opt-in consent, and costs more per message than utility. Check current rates.",
  },
};

const PEOPLE = [
  { name: "Aarav", item: "Forest hoodie, M", amount: "₹1,499", hours: "24" },
  { name: "Priya", item: "Oat hoodie, S", amount: "₹1,499", hours: "24" },
  { name: "Kabir", item: "Sand hoodie, XL", amount: "₹1,649", hours: "12" },
];

/**
 * How each part leaves the message, in px: everything shifts left to make room for
 * the notes, and the parts open up vertically like an exploded drawing.
 */
const SHIFT = -120;
const DY: Record<Part, number> = { category: -178, header: -108, body: -30, vars: 50, footer: 112, buttons: 178 };
const ORDER: Part[] = ["category", "header", "body", "vars", "footer", "buttons"];

/**
 * P7, The Anatomy. One template message, taken apart as you scroll: header, body, the
 * variables that change per shopper, footer, buttons, and the category that decides
 * what it costs and whether it needs consent. Switch between a utility and a marketing
 * template and every part explains itself again. Costs are never quoted as numbers:
 * Meta sets them, and they change.
 */
export function Anatomy() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [marketing, setMarketing] = useState(true);
  const [who, setWho] = useState(0);
  const [hot, setHot] = useState<Part | null>(null);
  const person = PEOPLE[who]!;

  useAttract(stage, () => setWho((n) => (n + 1) % PEOPLE.length), 2400);

  // where each part's centre lands once exploded, relative to the stage centre
  const bubble = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ y: Partial<Record<Part, number>>; edge: number } | null>(null);
  useLayoutEffect(() => {
    const b = bubble.current;
    if (!b) return;
    const measure = () => {
      const h = b.offsetHeight;
      const y: Partial<Record<Part, number>> = {};
      b.querySelectorAll<HTMLElement>("[data-part]").forEach((el) => {
        const part = el.dataset.part as Part;
        y[part] = el.offsetTop + el.offsetHeight / 2 - h / 2 + DY[part];
      });
      setLayout({ y, edge: b.offsetWidth / 2 + SHIFT });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(b);
    return () => ro.disconnect();
  }, [marketing]);

  // the explosion, scrubbed by the scroll
  useEffect(() => {
    const el = root.current;
    const st = stage.current;
    if (!el || !st) return;
    const parts = Array.from(st.querySelectorAll<HTMLElement>("[data-part]"));
    const notes = Array.from(st.querySelectorAll<HTMLElement>("[data-note]"));
    const leaders = Array.from(st.querySelectorAll<SVGLineElement>("[data-leader]"));
    if (prefersReducedMotion()) {
      st.dataset.open = "1";
      parts.forEach((p) => gsap.set(p, { x: SHIFT, y: DY[p.dataset.part as Part], opacity: 1 }));
      return;
    }
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6 } });
      tl.to("[data-shell]", { opacity: 0.18, x: SHIFT, scaleY: 1.5, duration: 0.42, ease: "glide" }, 0.08);
      parts.forEach((p, i) => {
        const part = p.dataset.part as Part;
        tl.to(p, { x: SHIFT, y: DY[part], opacity: 1, duration: 0.42, ease: "glide" }, 0.08 + i * 0.03);
      });
      leaders.forEach((l, i) => tl.fromTo(l, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.2, ease: "none" }, 0.36 + i * 0.03));
      notes.forEach((n, i) => tl.fromTo(n, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.2, ease: "none" }, 0.4 + i * 0.03));
      tl.to({}, { duration: 0.25 });
    }, el);
    const refresh = () => ScrollTrigger.refresh();
    void document.fonts.ready.then(refresh);
    return () => ctx.revert();
  }, []);

  const k = marketing ? "marketing" : "utility";
  const part = (p: Part) => ({
    "data-part": p,
    "data-hot": hot === p ? "1" : undefined,
    onPointerEnter: () => setHot(p),
    onPointerLeave: () => setHot(null),
    onFocus: () => setHot(p),
    onBlur: () => setHot(null),
    tabIndex: 0,
    "aria-describedby": `anatomy-${p}`,
  });

  return (
    <section ref={root} id="anatomy" className={styles.station} aria-label="The anatomy of a message">
      <div className={styles.sticky} data-motion-own>
        <header className={styles.head}>
          <span className={styles.index} aria-hidden>
            05b
          </span>
          <span className={`${styles.where} t-hud`}>
            <span>The anatomy of one message</span>
            <span className="c-muted">Scroll to take it apart</span>
          </span>
        </header>
        <div className={styles.copy}>
          <h2 className={styles.title}>Every message is a template someone approved.</h2>
          <p className={styles.lede}>Only the variables change. The category decides whether it needs consent, and what it costs to send.</p>
          <ToggleSwitch label="Template" checked={marketing} onChange={setMarketing} offLabel="Utility" onLabel="Marketing" />
        </div>
        <div ref={stage} className={styles.stage} data-kind={k}>
          <svg className={styles.leaders} viewBox="-500 -300 1000 600" aria-hidden>
            {layout
              ? ORDER.map((p) => {
                  const y = layout.y[p] ?? 0;
                  return (
                    <g key={p}>
                      <line data-leader x1={layout.edge + 8} y1={y} x2={layout.edge + 72} y2={y} pathLength={1} strokeDasharray="1" />
                      <circle cx={layout.edge + 8} cy={y} r={2.5} />
                    </g>
                  );
                })
              : null}
          </svg>
          <div ref={bubble} className={styles.bubble}>
            <div className={styles.shell} data-shell aria-hidden />
            <div className={styles.header} {...part("header")}>
              <span className={styles.thumb} aria-hidden />
              <span>{marketing ? "Still yours, for now" : "Payment not completed"}</span>
            </div>
            <p className={styles.body} {...part("body")}>
              {marketing ? (
                <>
                  Hi <b className={styles.var}>{person.name}</b>, your <b className={styles.var}>{person.item}</b> is still in your cart. We are holding it for{" "}
                  <b className={styles.var}>{person.hours}</b> hours.
                </>
              ) : (
                <>
                  Hi <b className={styles.var}>{person.name}</b>, your payment of <b className={styles.var}>{person.amount}</b> did not go through. Your cart is saved.
                </>
              )}
            </p>
            <div className={styles.vars} {...part("vars")} aria-label="Variables">
              <span className={styles.chip}>{"{{1}}"} {person.name}</span>
              <span className={styles.chip}>
                {"{{2}}"} {marketing ? person.item : person.amount}
              </span>
              {marketing ? (
                <span className={styles.chip}>
                  {"{{3}}"} {person.hours}
                </span>
              ) : null}
            </div>
            <p className={styles.footer} {...part("footer")}>
              {marketing ? "Reply STOP to opt out" : " "}
            </p>
            <div className={styles.buttons} {...part("buttons")}>
              {(marketing ? ["Complete my order", "Not now"] : ["Retry in one tap", "Pay by UPI", "Cash on delivery"]).map((b) => (
                <span key={b} className={styles.btn}>
                  {b}
                </span>
              ))}
            </div>
            <span className={styles.category} {...part("category")}>
              {marketing ? "Marketing" : "Utility"}
            </span>
          </div>
          {ORDER.map((p) => (
            <div
              key={p}
              id={`anatomy-${p}`}
              className={styles.note}
              data-note
              data-hot={hot === p ? "1" : undefined}
              style={{ "--x": `${(layout?.edge ?? 70) + 76}px`, "--y": `${layout?.y[p] ?? 0}px` } as CSSProperties}
            >
              <span className={`${styles.noteTitle} t-hud`}>{NOTES[p].title}</span>
              <span className={styles.noteText}>{NOTES[p][k]}</span>
            </div>
          ))}
        </div>
        <p className={`${styles.foot} t-small`}>A sample template for the fictional store. Rates are set by Meta and change; we never quote them as fact.</p>
      </div>
    </section>
  );
}
