"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { GLYPHS, LOGO_VIEWBOX } from "@/lib/logo/geometry";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { gl, ui } from "@/lib/store";
import { SCENE_FOR, SLOTS } from "@/lib/junction";
import styles from "./Splash.module.css";

type Stage = { id: "page" | "type" | "light"; label: string; weight: number; state: "waiting" | "ready" | "later" };
const STAGES: Stage[] = [
  { id: "page", label: "Page", weight: 0.2, state: "waiting" },
  { id: "type", label: "Type", weight: 0.3, state: "waiting" },
  { id: "light", label: "Light", weight: 0.5, state: "waiting" },
];

type Impl = { show: (slot: number, warm: boolean) => Promise<void>; reveal: () => Promise<void> };
let impl: Impl | null = null;

/** The arrival splash, for navigation code: cover with a destination, then reveal it. */
export const splash = {
  show: (slot: number, warm = false) => impl?.show(slot, warm) ?? Promise.resolve(),
  reveal: () => impl?.reveal() ?? Promise.resolve(),
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The destination's first scene has drawn, or it has none near the top: Light is ready. */
const lightReady = (href: string) =>
  new Promise<"ready" | "later">((resolve) => {
    const key = SCENE_FOR[href] ?? null;
    if (!key || ui.get().webgl === "unsupported") return resolve("later");
    const start = performance.now();
    const check = () => {
      const g = gl.get();
      if (ui.get().webgl === "ready" && g.scene === key && g.visible) return resolve("ready");
      if (performance.now() - start > 900) return resolve("later");
      requestAnimationFrame(check);
    };
    check();
  });

/** Each destination's beat inside the shared grammar of the loader. */
function Motif({ kind }: { kind: number }) {
  if (kind === 0)
    return (
      <svg viewBox={LOGO_VIEWBOX} className={styles.logo} aria-hidden>
        {GLYPHS.map((g, i) => (
          <polygon key={g.char} points={g.outline.map(([x, y]) => `${x},${y}`).join(" ")} style={{ "--i": i } as CSSProperties} />
        ))}
      </svg>
    );
  if (kind === 1)
    return (
      <div className={styles.lamps} aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>
    );
  if (kind === 2)
    return (
      <div className={styles.layers} aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>
    );
  if (kind === 3)
    return (
      <div className={styles.leader} aria-hidden>
        <span className={styles.sweep} />
        <span className={styles.count}>
          <b>3</b>
          <b>2</b>
          <b>1</b>
        </span>
      </div>
    );
  if (kind === 4) return <div className={styles.scan} aria-hidden />;
  return (
    <div className={styles.chat} aria-hidden>
      <span className={styles.typing}>
        <i />
        <i />
        <i />
      </span>
      <span className={styles.bubble}>Let&rsquo;s talk.</span>
    </div>
  );
}

/**
 * J2, the arrival splash: the loader the client loves, reused as the ceremony at the
 * end of a Junction dive. The destination's name stands in giant type that gains
 * weight as the Page, Type and Light stages really complete, the 000 counter climbs,
 * the page's own beat plays, and the name flies into the page's heading.
 */
export function Splash() {
  const root = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLParagraphElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [warm, setWarm] = useState(false);
  const [stages, setStages] = useState(STAGES);

  useEffect(() => {
    const level = { p: 0 };
    const paint = () => {
      if (pct.current) pct.current.textContent = String(Math.round(level.p * 100)).padStart(3, "0");
      title.current?.style.setProperty("--w", String(Math.round(260 + level.p * 640)));
    };
    const to = (p: number, d: number) => gsap.to(level, { p, duration: prefersReducedMotion() ? 0 : d, ease: "pour", onUpdate: paint, overwrite: true });

    impl = {
      show: async (s, isWarm) => {
        level.p = 0;
        setStages(STAGES);
        setWarm(isWarm);
        setSlot(s);
        paint();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const el = root.current;
        if (el) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: prefersReducedMotion() ? 0.2 : 0.12, ease: "none" });
        await wait(120);
      },
      reveal: async () => {
        const el = root.current;
        const s = slot ?? Number(root.current?.dataset.slot ?? 0);
        const href = SLOTS[s]?.href ?? "/";
        const started = performance.now();
        const budget = warm ? 500 : 1400;
        const mark = (id: Stage["id"], state: Stage["state"]) => setStages((list) => list.map((x) => (x.id === id && x.state === "waiting" ? { ...x, state } : x)));
        let done = 0;
        const add = (w: number) => {
          done += w;
          to(done, warm ? 0.2 : 0.45);
        };
        // the page has committed by the time reveal runs
        mark("page", "ready");
        add(0.2);
        await Promise.race([document.fonts.ready, wait(budget * 0.5)]);
        mark("type", "ready");
        add(0.3);
        const light = await lightReady(href);
        mark("light", light);
        add(0.5);
        // let the beat land, inside the budget
        const minimum = warm ? 280 : 820;
        const spent = performance.now() - started;
        if (spent < minimum) await wait(minimum - spent);
        await wait(warm ? 90 : 200);
        if (!el) return setSlot(null);
        // the name flies into the page's own heading, then the splash lifts
        const h1 = document.querySelector<HTMLElement>("main h1");
        const t = title.current;
        const tl = gsap.timeline();
        if (t && h1 && !prefersReducedMotion()) {
          const a = t.getBoundingClientRect();
          const b = h1.getBoundingClientRect();
          if (b.width > 0 && b.top < window.innerHeight) {
            const k = Math.min(1.2, b.height / a.height);
            tl.to(t, { x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2), scale: k, duration: 0.5, ease: "snap" }, 0);
          }
        }
        tl.to(el.querySelectorAll("[data-meta]"), { opacity: 0, duration: 0.2, ease: "none" }, 0);
        tl.to(el, { opacity: 0, duration: prefersReducedMotion() ? 0.2 : 0.34, ease: "none" }, prefersReducedMotion() ? 0 : 0.24);
        await tl.then();
        gsap.set(t, { clearProps: "transform" });
        setSlot(null);
      },
    };
    return () => {
      impl = null;
    };
  }, [slot, warm]);

  if (slot === null) return null;
  const dest = SLOTS[slot]!;
  return (
    <div ref={root} className={styles.splash} data-slot={slot} data-kind={slot} data-warm={warm ? "1" : undefined} role="status" aria-live="polite" aria-label={`Arriving at ${dest.label}`}>
      <div className={styles.motif}>
        <Motif kind={slot} />
      </div>
      <span className={styles.corners} aria-hidden />
      <div className={styles.stack}>
        <p className={`${styles.chapter} t-hud`} data-meta>
          <span>Arriving</span>
          <span className={styles.route}>
            {String(slot + 1).padStart(2, "0")} / {String(SLOTS.length).padStart(2, "0")}
          </span>
          <span>{dest.chapter}</span>
          <span className={styles.path}>{dest.href}</span>
        </p>
        <p ref={title} className={styles.title} aria-hidden>
          {dest.label}
        </p>
        <p className={`${styles.line} t-body`} data-meta>
          {dest.line}.
        </p>
        <div className={styles.meta} data-meta>
          <dl className={styles.tasks}>
            {stages.map((t) => (
              <div key={t.id} data-state={t.state}>
                <dt className="t-hud">{t.label}</dt>
                <dd className="t-hud">{t.state === "waiting" ? "loading" : t.state === "ready" ? "ready" : "later"}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.pct}>
            <span ref={pct} className="t-num">
              000
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
