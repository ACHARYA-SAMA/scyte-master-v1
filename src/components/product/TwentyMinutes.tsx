"use client";

import { useRef, useState } from "react";
import { INTENT_RULES, MOMENTS, THREAD } from "@/data/shopper";
import { scroller } from "@/components/providers/SmoothScroll";
import { ScrollTrigger, useGSAP } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { Phone } from "./Phone";
import { StoreMock } from "./StoreMock";
import styles from "./TwentyMinutes.module.css";

const N = MOMENTS.length;

export function TwentyMinutes() {
  const root = useRef<HTMLElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const [pos, setPos] = useState(0);
  const step = Math.min(N - 1, Math.floor(pos));
  const local = pos - step;
  const m = MOMENTS[step];

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      let last = -1;
      st.current = ScrollTrigger.create({
        trigger: el.querySelector("[data-track]"),
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const p = Math.min(N - 0.001, self.progress * N);
          setPos(p);
          const s = Math.floor(p);
          if (s !== last) {
            last = s;
            if (MOMENTS[s].messages > (MOMENTS[s - 1]?.messages ?? 0)) sfx.ok();
            else sfx.tick();
          }
        },
      });
    },
    { scope: root },
  );

  const scrub = (value: number) => {
    const t = st.current;
    if (!t) return;
    const y = t.start + ((t.end - t.start) * (value + 0.5)) / N;
    if (scroller.lenis) scroller.lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  };

  // the checkbox ticks part-way through the checkout moment, never before it
  const consentTicked = step > 3 || (step === 3 && local > 0.35);
  const messages = THREAD.filter((msg, i) => i === 0 || i <= m.messages);

  return (
    <section ref={root} className={styles.section} aria-labelledby="aarav-title">
      <div className={styles.track} data-track>
        <div className={styles.sticky}>
          <div className={styles.head}>
            <h2 id="aarav-title" className={styles.kicker}>
              A shopper&rsquo;s 20 minutes
            </h2>
            <p className={styles.clock} aria-live="polite" aria-atomic="true">
              <span className="sr-only">At </span>
              {m.clock}
            </p>
            <p className={styles.title}>{m.title}</p>
          </div>

          <div className={styles.store}>
            <StoreMock screen={m.screen} consentTicked={consentTicked} />
          </div>

          <div className={styles.log}>
            <p className={styles.logTitle}>Event stream</p>
            <ol className={styles.events}>
              {MOMENTS.slice(0, step + 1)
                .flatMap((mo, i) => mo.events.map((e) => ({ e, i, clock: mo.clock })))
                .slice(-7)
                .map(({ e, i, clock }) => (
                  <li key={`${i}-${e}`} data-new={i === step ? "1" : undefined}>
                    <span className="t-num">{clock}</span>
                    <code>{e}</code>
                  </li>
                ))}
            </ol>
            <div className={styles.intent}>
              <p className={styles.logTitle}>
                Intent score <span className="t-num">{m.intent}</span>
              </p>
              <span className={styles.meter} aria-hidden>
                <i style={{ transform: `scaleX(${m.intent / 100})` }} />
              </span>
              <ul className={styles.rules}>
                {INTENT_RULES.map((r, i) => (
                  <li key={r.label} data-hit={m.intent >= [15, 25, 35, 55, 70][i] ? "1" : undefined}>
                    <span>{r.label}</span>
                    <span className="t-num">+{r.points}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.fine}>Points are illustrative. Real thresholds are tuned per store.</p>
            </div>
          </div>

          <div className={styles.phone}>
            <Phone brand="Hoodie Co." time={m.messages >= 3 ? "11:20" : "15:05"} messages={messages} label="Messages Aarav receives" />
          </div>

          <div className={styles.scrubber}>
            <label htmlFor="aarav-scrub" className="sr-only">
              Scrub through the 20 minutes
            </label>
            <input
              id="aarav-scrub"
              type="range"
              min={0}
              max={N - 1}
              step={1}
              value={step}
              aria-valuetext={`${m.clock}: ${m.title}`}
              onChange={(e) => scrub(Number(e.target.value))}
              className={styles.range}
              data-cursor="drag"
              data-cursor-label="Scrub"
            />
            <ol className={styles.ticks} aria-hidden>
              {MOMENTS.map((mo, i) => (
                <li key={mo.clock} data-state={i < step ? "done" : i === step ? "on" : "off"}>
                  <span className="t-num">{mo.clock}</span>
                </li>
              ))}
            </ol>
            <span className={styles.progress} style={{ transform: `scaleX(${Math.min(1, pos / (N - 1))})` }} aria-hidden />
          </div>
          <p className={styles.note}>Worked example from our business report. Fictional store, fictional shopper.</p>
        </div>
      </div>
    </section>
  );
}
