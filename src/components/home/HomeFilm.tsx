"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { SceneSection } from "@/components/gl/SceneSection";
import { cine, film, flashAt, ramp, SHOTS } from "@/components/gl/scenes/home/film";
import { InteractivePhone } from "@/components/devices/InteractivePhone";
import { TransitionLink } from "@/components/transition/navigation";
import { useChapters } from "@/components/shell/chapters";
import { Clock } from "@/components/nav/Nav";
import { Odometer } from "@/components/kit/Odometer";
import { PAYMENT_FAILED } from "@/lib/chat/flows";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { recordRecovery, session, toast, ui, useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { useMedia } from "@/lib/useMedia";
import { productName } from "@/config/site";
import { HeroLogo } from "./HeroLogo";
import styles from "./HomeFilm.module.css";

const ORDER = ["hero", "flow", "leaks", "shopper", "relit", "studio"] as const;
const STARTS: Record<(typeof ORDER)[number], number> = {
  hero: SHOTS.hero[0],
  flow: SHOTS.approach[0],
  leaks: SHOTS.leaks[0],
  shopper: SHOTS.shopper[0],
  relit: SHOTS.relit[0],
  studio: SHOTS.reveal[0],
};

/** The report's illustrative unit economics (section 13). Not a client result. */
const FIGURES = [
  { value: 80, prefix: "", label: "recovered orders a month" },
  { value: 120000, prefix: "₹", label: "gross recovered revenue" },
  { value: 72000, prefix: "₹", label: "incremental, after the holdout" },
  { value: 54400, prefix: "₹", label: "net of software fee and message costs" },
];

const chapterOf = (p: number) => {
  let c = 0;
  ORDER.forEach((k, i) => {
    if (p >= STARTS[k] - 0.001) c = i;
  });
  return c;
};

/** A line set letter by letter, so it can resolve out of blur one character at a time. */
function Split({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  let i = 0;
  return (
    <span className={className} style={{ "--n": text.length } as CSSProperties}>
      <span className="sr-only">{text}</span>
      {words.map((w, wi) => (
        <span key={wi} className={styles.word} aria-hidden>
          {Array.from(w).map((ch) => (
            <span key={i} className={styles.char} style={{ "--i": i++ } as CSSProperties}>
              {ch}
            </span>
          ))}
          {wi < words.length - 1 ? <span className={styles.char} style={{ "--i": i++ } as CSSProperties}>{" "}</span> : null}
        </span>
      ))}
    </span>
  );
}

type Place = "left" | "right" | "center" | "low";

/**
 * A title card on its own layer. It resolves in as the camera reaches it and, on the
 * way out, grows and blurs from the middle of the screen, as if the camera flew
 * through the words.
 */
function Title({ from, to, kicker, line, sub, place = "left", wide, children }: { from: number; to: number; kicker?: string; line: string; sub?: string; place?: Place; wide?: boolean; children?: ReactNode }) {
  return (
    <div className={styles.layer} data-title data-from={from} data-to={to} data-place={place}>
      <div className={styles.card}>
        {kicker ? <p className={`${styles.kicker} t-hud`}>{kicker}</p> : null}
        <h2 className={wide ? styles.wideLine : styles.line}>
          <Split text={line} />
        </h2>
        {sub ? <p className={styles.sub}>{sub}</p> : null}
        {children}
      </div>
    </div>
  );
}

/** H2, the ledger: the four illustrative figures on odometers, rolling in when Relit arrives. */
function Figures({ on }: { on: boolean }) {
  const [zero, setZero] = useState(true);
  useEffect(() => {
    if (!on) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the wheels start at zero and roll to the figure
    setZero(true);
    const t = window.setTimeout(() => setZero(false), 120);
    return () => window.clearTimeout(t);
  }, [on]);
  return (
    <dl className={styles.figures}>
      {FIGURES.map((f, i) => (
        <div key={f.label}>
          <dd className="t-fig">
            <Odometer value={zero ? 0 : f.value} prefix={f.prefix} duration={1.4 + i * 0.15} sound={i === 0} />
          </dd>
          <dt className="t-small">{f.label}</dt>
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
        {events.slice(-7).map((ev, i) => (
          <li key={`${ev.t}-${i}`} className={styles.recordItem}>
            <time className="t-hud c-muted">{ev.t}</time>
            <code className={styles.event}>{ev.e}</code>
          </li>
        ))}
      </ol>
    </div>
  );
}

const stamp = () =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());

/** Panels you use, not just watch: on for this window of the film. */
const PANELS = {
  shopper: [0.588, 0.712],
  relit: [0.778, 0.846],
  finale: [0.902, 9],
} as const;

/**
 * Home, The Leak, as one continuous shot. The canvas behind carries the film; this
 * layer carries every word, every control and the fallback. Titles follow the
 * camera's own eased progress, so type and picture land on the same frame.
 */
export function HomeFilm() {
  const [chapter, setChapter] = useState(0);
  const [phoneOn, setPhoneOn] = useState(false);
  const [relitOn, setRelitOn] = useState(false);
  const [events, setEvents] = useState<{ e: string; t: string }[]>([]);
  const [recovered, setRecovered] = useState(false);
  const webgl = useStore(ui, (s) => s.webgl);
  const total = useStore(session, (s) => s.recovered);
  const glass = useStore(film, (s) => s.glass);
  const small = useMedia("(max-width: 640px)");
  const root = useRef<HTMLDivElement>(null);
  const raw = useRef(0);
  const lastChapter = useRef(0);
  const fallback = webgl === "unsupported";

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

  // one ticker writes the whole layer: titles, bars, the burst of light, the hero
  useEffect(() => {
    const box = root.current;
    if (!box) return;
    const titles = Array.from(box.querySelectorAll<HTMLElement>("[data-title]")).map((el) => ({
      el,
      from: Number(el.dataset.from),
      to: Number(el.dataset.to),
      on: null as boolean | null,
    }));
    const panels = Object.entries(PANELS).map(([id, [from, to]]) => ({ el: box.querySelector<HTMLElement>(`[data-panel="${id}"]`), from, to, on: null as boolean | null }));
    const hero = box.querySelector<HTMLElement>("[data-hero]");
    const mount = performance.now();
    // once the opening titles are in they stay in, even if the glass arrives late and restarts its clock
    let heroIn = 0;
    let last = "";
    const paint = () => {
      const reduced = prefersReducedMotion();
      // follow the camera while it draws; scroll alone otherwise
      const p = cine.live ? cine.p : raw.current;
      const waited = ramp(performance.now() - mount, 1800, 3200);
      const intro = cine.live ? cine.intro : 0;
      heroIn = Math.max(heroIn, cine.live ? ramp(intro, 0.4, 0.82) : waited);
      const key = `${p.toFixed(5)}|${intro.toFixed(3)}|${heroIn.toFixed(3)}`;
      if (key === last) return;
      last = key;
      for (const t of titles) {
        const a = ramp(p, t.from, t.from + 0.024);
        const x = ramp(p, t.to - 0.02, t.to);
        const on = p > t.from && p < t.to;
        t.el.style.setProperty("--a", a.toFixed(3));
        t.el.style.setProperty("--x", x.toFixed(3));
        if (on !== t.on) {
          t.on = on;
          t.el.dataset.on = on ? "1" : "0";
        }
      }
      for (const t of panels) {
        if (!t.el) continue;
        const a = ramp(p, t.from, t.from + 0.022);
        const x = ramp(p, t.to - 0.018, t.to);
        t.el.style.setProperty("--a", a.toFixed(3));
        t.el.style.setProperty("--x", x.toFixed(3));
        const on = p > t.from + 0.004 && p < t.to - 0.004;
        if (on !== t.on) {
          t.on = on;
          t.el.dataset.on = on ? "1" : "0";
          t.el.setAttribute("aria-hidden", on ? "false" : "true");
          t.el.inert = !on;
        }
      }
      if (hero) {
        hero.style.setProperty("--a", heroIn.toFixed(3));
        hero.style.setProperty("--x", ramp(p, 0.018, 0.056).toFixed(3));
        hero.style.setProperty("--logo", (1 - ramp(intro, 0.02, 0.22)).toFixed(3));
        hero.dataset.on = p < 0.058 ? "1" : "0";
      }
      // letterbox: in with the titles, out for the phone and for the finale
      const bars = Math.max(ramp(intro, 0.3, 0.9), heroIn) * (1 - ramp(p, 0.565, 0.59) + ramp(p, 0.712, 0.735)) * (1 - ramp(p, 0.878, 0.905));
      box.style.setProperty("--bars", (reduced ? 0 : bars).toFixed(3));
      box.style.setProperty("--flash", (reduced ? 0 : flashAt(p)).toFixed(3));
      box.style.setProperty("--p", p.toFixed(4));
    };
    gsap.ticker.add(paint);
    paint();
    return () => gsap.ticker.remove(paint);
  }, []);

  const onProgress = useCallback((p: number) => {
    raw.current = p;
    const c = chapterOf(p);
    setChapter((prev) => (prev === c ? prev : c));
    if (p > PANELS.shopper[0] - 0.03) setPhoneOn(true);
    setRelitOn(p > PANELS.relit[0] && p < PANELS.relit[1]);
    if (c !== lastChapter.current) {
      // a cut: the light bursts, the sound sweeps
      if ((c === 2 && lastChapter.current === 1) || (c === 5 && lastChapter.current === 4)) sfx.whoosh();
      lastChapter.current = c;
    }
  }, []);

  const onEvent = useCallback((e: string) => setEvents((list) => [...list, { e, t: stamp() }]), []);
  const onOutcome = useCallback((o: string) => {
    if (o === "recovered") {
      setRecovered(true);
      recordRecovery("payment-failed");
      toast("Recovered. One more order on this visit.", "ok");
    }
  }, []);

  return (
    <SceneSection scene="home" className={styles.section} data-fallback={fallback ? "1" : undefined} onProgress={onProgress} aria-label="The leak">
      {ORDER.map((k) => (
        <span key={k} id={`leak-${k}`} className={styles.marker} style={{ top: `calc((100% - 100svh) * ${STARTS[k]})` }} aria-hidden />
      ))}
      <div ref={root} className={styles.sticky} data-chapter={chapter} data-glass={glass ? "1" : undefined} data-motion-own>
        {fallback ? <div className={styles.fallbackArt} aria-hidden /> : null}
        <div className={styles.scrim} aria-hidden />

        {/* the opening: the exact mark first, which hands over to the monument */}
        <div className={styles.hero} data-hero data-on="1">
          <div className={styles.heroLogo}>
            <HeroLogo />
          </div>
          <div className={styles.heroFoot}>
            <div className={styles.heroCopy}>
              <p className={`${styles.kicker} t-hud`}>Scyte, a web and app studio in Hyderabad</p>
              <h1 className={styles.heroTitle}>
                <span className="sr-only">Scyte. </span>
                <Split text="Your shoppers didn’t leave." className={styles.heroLine} />
                <Split text="Your store leaked them." className={styles.heroLine} />
              </h1>
            </div>
            <div className={styles.heroSide}>
              <p className={styles.heroLede}>
                We design and build websites and apps. We are also building {productName()}, which catches the shoppers an online store loses at
                checkout and brings them back on WhatsApp, with their consent.
              </p>
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
              </dl>
            </div>
          </div>
          <p className={`${styles.cue} t-hud`} aria-hidden>
            <span>Scroll to follow one shopper</span>
            <i />
          </p>
        </div>

        <Title from={0.07} to={0.168} kicker="01 · The flow" line="Every store is a pipe." sub="Light goes in as visits. It should come out as orders." place="left" />
        <Title
          from={0.228}
          to={0.34}
          line="Every visit is a drop of light."
          sub="An ad click. A product view. A size chart opened. An item in the cart. Most stores record all of it and act on none of it."
          place="left"
        />
        <Title
          from={0.384}
          to={0.444}
          kicker="02 · The leaks"
          line="Then the payment fails."
          sub="A UPI app that never came back. A bank that said no. The light falls out of the pipe, and most dashboards call it abandonment."
          place="right"
        />
        <Title from={0.45} to={0.515} line="Every leak has a reason code." sub="The payment gateway says why. Each reason has its own fix." place="right" />
        <Title from={0.522} to={0.58} line="Follow one drop." place="center" wide />
        <Title
          from={0.72}
          to={0.772}
          kicker="Five seconds later"
          line="Every fix is a playbook."
          sub="A retry in one tap. Another UPI app. Cash on delivery. A saved cart. Matched to the reason, sent once, with consent."
          place="right"
        />

        {/* 03 one shopper: the phone works */}
        <article className={`${styles.panel} ${styles.shopper}`} data-panel="shopper" data-on="0" aria-hidden="true">
          <div className={styles.shopperCopy}>
            <p className={`${styles.kicker} t-hud`}>03 · One shopper</p>
            <h2 className={styles.panelTitle}>Aarav still wants the hoodie.</h2>
            <p className={styles.panelBody}>His UPI timed out at 3:00. Five seconds later, this lands on his phone. You are Aarav: tap through it, or type.</p>
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

        {/* 04 relit: the ledger */}
        <article className={`${styles.panel} ${styles.relit}`} data-panel="relit" data-on="0" aria-hidden="true">
          <p className={`${styles.kicker} t-hud`}>04 · Relit</p>
          <h2 className={styles.panelTitle}>Fewer messages. Better timed. Provably yours.</h2>
          <p className={styles.panelBody}>
            One example brand: 2,000 orders a month at ₹1,500. Of 5,000 abandoned carts, 2,000 have a phone number and consent. Four in a
            hundred order after a message, and six in ten of those orders would not have happened without it. We know which six because a
            holdout group hears nothing.
          </p>
          <Figures on={relitOn} />
          <p className={`${styles.aside} t-small`}>Illustrative, from our business model. Not a client result.</p>
        </article>

        {/* 05 the builders: the gate stands lit above, the copy takes the band below */}
        <article className={`${styles.panel} ${styles.closing}`} data-panel="finale" data-on="0" aria-hidden="true">
          <div className={styles.closingCopy}>
            <p className={`${styles.kicker} t-hud`}>05 · The builders</p>
            <h2 className={styles.closingTitle}>We build the machine, and the storefront in front of it.</h2>
            <p className={styles.closingLead}>Websites, apps, and the recovery engine behind them. Designed and built in Hyderabad.</p>
          </div>
          <div className={styles.ctas} data-avoid>
            <TransitionLink href="/product" className={`${styles.cta} cta`} data-glow data-magnetic data-cursor="open">
              See how the machine works
            </TransitionLink>
            <TransitionLink href="/studio" className={`${styles.ctaQuiet} cta`} data-magnetic data-cursor="open">
              Meet the studio
            </TransitionLink>
          </div>
        </article>

        {/* letterbox and the burst of light at each cut */}
        <div className={styles.bars} aria-hidden>
          <span />
          <span />
        </div>
        <div className={styles.flash} aria-hidden />
      </div>
    </SceneSection>
  );
}
