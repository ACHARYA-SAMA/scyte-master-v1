"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SceneSection } from "@/components/gl/SceneSection";
import { HOME_CHAPTERS, sealAll, leak, resetLeak } from "@/components/gl/scenes/home/leak";
import { InteractivePhone } from "@/components/devices/InteractivePhone";
import { TransitionLink } from "@/components/transition/navigation";
import { useChapters } from "@/components/shell/chapters";
import { Clock } from "@/components/nav/Nav";
import { PAYMENT_FAILED } from "@/lib/chat/flows";
import { recordRecovery, session, toast, ui, useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { useMedia } from "@/lib/useMedia";
import { productName } from "@/config/site";
import { HeroLogo } from "./HeroLogo";
import { HudLabels, type HudLabel } from "./HudLabels";
import { LeakControls } from "./LeakControls";
import { ToggleSwitch } from "@/components/kit/ToggleSwitch";
import { AnchorDock } from "@/components/kit/AnchorDock";
import { RotaryKnob } from "@/components/kit/RotaryKnob";
import { LeverSwitch } from "@/components/kit/LeverSwitch";
import { Odometer } from "@/components/kit/Odometer";
import styles from "./HomeLeak.module.css";

const CH = HOME_CHAPTERS;
const ORDER = ["hero", "flow", "leaks", "shopper", "relit", "studio"] as const;
const STARTS = ORDER.map((k) => CH[k][0]);

const MASKS = [
  { at: CH.flow[0], word: "The flow" },
  { at: CH.leaks[0], word: "The leaks" },
  { at: CH.shopper[0], word: "One shopper" },
  { at: CH.relit[0], word: "Relit" },
  { at: CH.studio[0], word: "The builders" },
];

const LABELS: HudLabel[] = [
  { id: "store", anchor: "store", title: "Demo store", detail: "page_view {source: instagram_ad}", chapters: [1] },
  { id: "view", anchor: "view", title: "product_view", detail: "engaged_time 38 s", chapters: [1] },
  { id: "size", anchor: "sizeChart", title: "size_chart_open", detail: "review_scroll 80 %", chapters: [1], side: "left" },
  { id: "cart", anchor: "cart", title: "add_to_cart", detail: "variant M", chapters: [1] },
  { id: "checkout", anchor: "checkout", title: "checkout_started", detail: "consent_granted {whatsapp}", chapters: [1, 2] },
  { id: "fork", anchor: "fork", title: "payment", detail: "succeeds right, fails left", chapters: [2] },
  { id: "c0", anchor: "crack0", title: "UPI_TIMEOUT", detail: "hold to clamp", chapters: [2] },
  { id: "c1", anchor: "crack1", title: "BANK_DECLINE", detail: "hold to clamp", chapters: [2] },
  { id: "c2", anchor: "crack2", title: "INSUFFICIENT_FUNDS", detail: "hold to clamp", chapters: [2] },
  { id: "c3", anchor: "crack3", title: "USER_CANCELLED", detail: "hold to clamp", chapters: [2] },
  { id: "paid", anchor: "paid", title: "payment_success", chapters: [2, 4] },
  { id: "send", anchor: "send", title: "message_sent", detail: "template approved", chapters: [4] },
  { id: "order", anchor: "order", title: "order_created", chapters: [4] },
];

/** The report's illustrative unit economics (section 13). Not a client result. */
const FIGURES = [
  { value: 80, prefix: "", suffix: "", label: "recovered orders a month" },
  { value: 120000, prefix: "₹", suffix: "", label: "gross recovered revenue" },
  { value: 72000, prefix: "₹", suffix: "", label: "incremental, after the holdout" },
  { value: 54400, prefix: "₹", suffix: "", label: "net of software fee and message costs" },
];

/** Keep labels off the copy: the left column on wide screens, the bottom half on narrow ones. */
const avoidCopy = (x: number, y: number, w: number, h: number) => (w > 820 ? x < Math.min(w * 0.47, 760) : y > h * 0.5 || y < 90);

const chapterOf = (p: number) => {
  let c = 0;
  STARTS.forEach((s, i) => {
    if (p >= s) c = i;
  });
  return c;
};

/** H2, the ledger: the four illustrative figures on odometers. They roll in when Relit arrives and again on every release. */
function Figures({ on }: { on: boolean }) {
  const surge = useStore(leak, (s) => s.surge);
  const [zero, setZero] = useState(true);
  useEffect(() => {
    if (!on) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the wheels start at zero and roll to the figure
    setZero(true);
    const t = window.setTimeout(() => setZero(false), 90);
    return () => window.clearTimeout(t);
  }, [on, surge]);
  return (
    <dl className={styles.figures}>
      {FIGURES.map((f, i) => (
        <div key={f.label}>
          <dt className="t-small">{f.label}</dt>
          <dd className="t-fig">
            <Odometer value={zero ? 0 : f.value} prefix={f.prefix} duration={1.4 + i * 0.15} sound={i === 0} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Record({ events }: { events: { e: string; t: string }[] }) {
  return (
    <div className={styles.record}>
      <p className={`${styles.recordHead} t-hud`}>What the dashboard records</p>
      <ol className={styles.recordList} aria-live="polite">
        {events.length === 0 ? <li className="t-small c-muted">Waiting for the first message.</li> : null}
        {events.slice(-8).map((ev, i) => (
          <li key={`${ev.t}-${i}`} className={styles.recordItem}>
            <time className="t-hud c-muted">{ev.t}</time>
            <code className={styles.event}>{ev.e}</code>
          </li>
        ))}
      </ol>
    </div>
  );
}

const stamp = () => {
  const d = new Date();
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", minute: "2-digit", second: "2-digit", hour12: false }).format(d);
};

/**
 * Home, The Leak: one pinned, scrubbed scene through the glass wordmark. The DOM here
 * carries every word, every control and the fallback; the canvas behind carries light.
 */
export function HomeLeak() {
  const [chapter, setChapter] = useState(0);
  // the copy for a chapter waits until its title has swept past
  const [panel, setPanel] = useState(0);
  const [events, setEvents] = useState<{ e: string; t: string }[]>([]);
  const [recovered, setRecovered] = useState(false);
  const [phoneOn, setPhoneOn] = useState(false);
  const webgl = useStore(ui, (s) => s.webgl);
  const glass = useStore(leak, (s) => s.glass);
  const total = useStore(session, (s) => s.recovered);
  const small = useMedia("(max-width: 640px)");
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const masks = useRef<(HTMLDivElement | null)[]>([]);
  const seen = useRef(new Set<number>());
  const lastChapter = useRef(0);
  const closing = useRef<HTMLElement>(null);
  const ignition = useStore(leak, (s) => s.ignition);
  const failShare = useStore(leak, (s) => s.failShare);


  // the finale's logo frame ends where the closing copy begins; the camera solves to it
  useEffect(() => {
    const el = closing.current;
    const box = root.current;
    if (!el || !box) return;
    const ro = new ResizeObserver(() => {
      const bottom = parseFloat(getComputedStyle(el).bottom) || 0;
      box.style.setProperty("--closing-h", `${Math.round(el.offsetHeight + bottom + 24)}px`);
      window.dispatchEvent(new Event("scyte:finale"));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useChapters(
    useMemo(
      () => [
        { id: "hero", label: "Start", target: "leak-hero" },
        { id: "flow", label: "The flow", target: "leak-flow" },
        { id: "leaks", label: "The leaks", target: "leak-leaks" },
        { id: "shopper", label: "One shopper", target: "leak-shopper" },
        { id: "relit", label: "Relit", target: "leak-relit" },
        { id: "studio", label: "The builders", target: "leak-studio" },
      ],
      [],
    ),
  );

  useEffect(() => () => resetLeak(), []);

  const onProgress = useCallback((p: number) => {
    const c = chapterOf(p);
    setChapter((prev) => (prev === c ? prev : c));
    const pc = chapterOf(Math.max(0, p - 0.024));
    setPanel((prev) => (prev === pc ? prev : pc));
    if (c === 3) setPhoneOn(true);
    // arriving at the builders lights the sign; the switch stays as a replay
    if (c === 5 && lastChapter.current !== 5) {
      leak.set((s) => ({ ignition: true, ignite: s.ignite + 1 }));
      sfx.relay();
    }
    lastChapter.current = c;
    if (!seen.current.has(c)) {
      seen.current.add(c);
      if (c === 4 && leak.get().sealed.some((s) => !s)) {
        sealAll();
        toast("The matching playbooks clamped the rest.");
      }
    }
    // the hero hands over to the glass: the DOM logo fades as the camera starts to move
    const h = hero.current;
    if (h) {
      const glass = ui.get().webgl === "ready";
      const k = Math.min(1, Math.max(0, (p - 0.004) / 0.026));
      h.style.setProperty("--hero-fade", String(1 - k));
      h.style.setProperty("--hero-lift", glass ? "0px" : `${-k * 18}vh`);
      h.style.visibility = k >= 1 ? "hidden" : "visible";
    }
    // giant words that mask the turn between chapters
    MASKS.forEach((m, i) => {
      const el = masks.current[i];
      if (!el) return;
      const t = (p - (m.at - 0.016)) / 0.042;
      const on = t > 0 && t < 1;
      el.dataset.on = on ? "1" : "0";
      if (!on) return;
      const open = Math.sin(Math.PI * t);
      el.style.setProperty("--open", open.toFixed(3));
      el.style.setProperty("--slide", `${((0.5 - t) * 28).toFixed(2)}vw`);
    });
    if (root.current) root.current.style.setProperty("--p", p.toFixed(4));
  }, []);

  const onEvent = useCallback((e: string) => setEvents((list) => [...list, { e, t: stamp() }]), []);
  const onOutcome = useCallback((o: string) => {
    if (o === "recovered") {
      setRecovered(true);
      recordRecovery("payment-failed");
      toast("Recovered. One more order on this visit.", "ok");
    }
  }, []);

  const fallback = webgl === "unsupported";

  return (
    <SceneSection scene="home" className={styles.section} data-fallback={fallback ? "1" : undefined} onProgress={onProgress} aria-label="The leak">
      {ORDER.map((k) => (
        <span key={k} id={`leak-${k}`} className={styles.marker} style={{ top: `calc((100% - 100svh) * ${CH[k][0]})` }} aria-hidden />
      ))}
      <div ref={root} className={styles.sticky} data-chapter={chapter} data-motion-own>
        {fallback ? <div className={styles.fallbackArt} aria-hidden /> : null}

        <HudLabels labels={LABELS} chapter={chapter} avoid={chapter === 3 ? undefined : avoidCopy} />

        {/* hero */}
        <div ref={hero} className={styles.hero} data-on={chapter === 0 ? "1" : "0"} data-glass={glass ? "1" : undefined}>
          <div className={styles.heroLogo}>
            <HeroLogo />
          </div>
          <div className={styles.heroCopy}>
            <h1 className={`${styles.heroTitle} t-h2`}>
              <span className="sr-only">Scyte. </span>Your shoppers didn’t leave. Your store leaked them.
            </h1>
            <p className={`${styles.heroLede} t-body`}>
              Scyte is a web and app studio in Hyderabad. We are also building {productName()}, which catches the shoppers an online
              store loses at checkout and brings them back on WhatsApp, with their consent.
            </p>
          </div>
          <dl className={`${styles.heroMeta} t-hud`}>
            <div>
              <dt className="sr-only">Where</dt>
              <dd>17.385° N, 78.487° E</dd>
            </div>
            <div>
              <dt className="sr-only">Local time</dt>
              <dd>
                Hyderabad <Clock />
              </dd>
            </div>
            <div className={styles.scrollHint}>
              <dt className="sr-only">Next</dt>
              <dd>Scroll to follow one shopper</dd>
            </div>
          </dl>
        </div>

        {/* chapter masks */}
        {MASKS.map((m, i) => (
          <div
            key={m.word}
            ref={(el) => {
              masks.current[i] = el;
            }}
            className={styles.mask}
            data-on="0"
            aria-hidden
          >
            <span className="t-bleed">{m.word}</span>
          </div>
        ))}

        {/* H6, the pressure valve on the fork: how many payments fail here, turned by hand */}
        {chapter === 2 ? (
          <AnchorDock at="fork" scene="home" center className={styles.valve} label="Failure rate valve">
            <RotaryKnob label="Failure rate" value={Math.round(failShare * 100)} min={0} max={60} step={5} onChange={(v) => leak.set({ failShare: v / 100 })} format={(v) => `${v} %`} hint="Simulation" size="s" />
          </AnchorDock>
        ) : null}
        {/* 1 the flow */}
        <article className={`${styles.panel} ${styles.left}`} data-on={panel === 1 ? "1" : "0"} aria-hidden={panel !== 1}>
          <p className={`${styles.kicker} t-hud`}><span>01</span>The flow</p>
          <h2 className="t-h2">A store is a pipe.</h2>
          <p className="t-lead">
            Every visit is a drop of light. An ad click, a product view, a size chart opened, an item in the cart. Most stores record
            all of it and act on none of it.
          </p>
          <p className={`${styles.aside} t-small`}>Each label is an event the tracking script records, in the order Aarav makes them.</p>
        </article>

        {/* 2 the leaks */}
        <article className={`${styles.panel} ${styles.left} ${styles.wide}`} data-on={panel === 2 ? "1" : "0"} aria-hidden={panel !== 2}>
          <p className={`${styles.kicker} t-hud`}><span>02</span>The leaks</p>
          <h2 className="t-h2">Every leak has a reason code.</h2>
          <p className="t-body">
            At the payment step, some drops fall out. Most dashboards call that abandonment. The payment gateway says why, and each
            reason has its own fix. Press and hold a crack to clamp it.
          </p>
          <LeakControls />
        </article>

        {/* 3 one shopper */}
        <article className={`${styles.panel} ${styles.shopper}`} data-on={panel === 3 ? "1" : "0"} aria-hidden={panel !== 3}>
          <div className={styles.shopperCopy}>
            <p className={`${styles.kicker} t-hud`}><span>03</span>One shopper</p>
            <h2 className="t-h2">Aarav still wants the hoodie.</h2>
            <p className="t-body">
              His UPI timed out at 3:00. Five seconds later, this lands on his phone. You are Aarav: tap through it, or type.
            </p>
            {recovered ? (
              <p className={`${styles.win} t-small`}>
                <span className={styles.winDot} aria-hidden />
                Recovered. Orders recovered on this visit: <b className="t-num">{total}</b>
              </p>
            ) : null}
          </div>
          <div className={styles.phoneSlot}>
            <InteractivePhone
              flow={PAYMENT_FAILED}
              active={phoneOn}
              variant={small ? "frameless" : "device"}
              onEvent={onEvent}
              onOutcome={onOutcome}
              label="Demo chat: the payment-failed rescue"
            />
          </div>
          <Record events={events} />
        </article>

        {/* 4 relit */}
        <article className={`${styles.panel} ${styles.left} ${styles.wide}`} data-on={panel === 4 ? "1" : "0"} aria-hidden={panel !== 4}>
          <p className={`${styles.kicker} t-hud`}><span>04</span>Relit</p>
          <h2 className="t-h2">Fewer messages. Better timed. Provably yours.</h2>
          <p className="t-body">
            One example brand: 2,000 orders a month at ₹1,500. Of 5,000 abandoned carts, 2,000 have a phone number and consent. Four in
            a hundred order after a message, and six in ten of those orders would not have happened without it. We know which six
            because a holdout group hears nothing.
          </p>
          <Figures on={panel === 4} />
          <p className={`${styles.aside} t-small`}>Illustrative, from our business model. Not a client result.</p>
          {/* H6, the release lever: flush the clamped drops through the main line */}
          <div className={styles.release}>
            <LeverSwitch label="Release" positions={["Hold", "Release"]} mode="pull" orientation="horizontal" onPull={() => leak.set({ surge: performance.now() })} size="m" />
            <p className="t-small">Pull to flush what the fixes caught back through the line. The ledger rolls again.</p>
          </div>
        </article>

        {/* 5 the builders: the logo gets the frame above, the copy the band below */}
        <div className={styles.finaleFrame} data-finale-logo aria-hidden data-on={panel === 5 ? "1" : "0"} />
        <article ref={closing} className={`${styles.panel} ${styles.closing}`} data-on={panel === 5 ? "1" : "0"} aria-hidden={panel !== 5}>
          <div className={styles.closingCopy}>
            <p className={`${styles.kicker} t-hud`}><span>05</span>The builders</p>
            <h2 className={styles.closingTitle}>We build the machine, and the storefront in front of it.</h2>
            <p className={styles.closingLead}>Look again. The pipes were our name the whole time.</p>
          </div>
          <div className={styles.closingActions} data-avoid>
            <ToggleSwitch
              label="Ignition"
              checked={ignition}
              onChange={(on) => leak.set((s) => ({ ignition: on, ignite: on ? s.ignite + 1 : s.ignite }))}
              offLabel="Dark"
              onLabel="Lit"
            />
            <div className={styles.ctas}>
              <TransitionLink href="/product" className={`${styles.cta} cta`} data-glow data-magnetic data-cursor="open">
                See how the machine works
              </TransitionLink>
              <TransitionLink href="/studio" className={`${styles.ctaQuiet} cta`} data-magnetic data-cursor="open">
                Meet the studio
              </TransitionLink>
            </div>
          </div>
        </article>
      </div>
    </SceneSection>
  );
}
