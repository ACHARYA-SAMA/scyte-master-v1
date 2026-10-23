"use client";

import { useEffect, useRef, useState } from "react";
import { identity } from "@/components/gl/scenes/identify/identity";
import { PatchBay } from "@/components/product/decide/PatchBay";
import type { Rules, Step } from "@/components/product/decide/patch";
import { HoldToConfirm } from "@/components/kit/HoldToConfirm";
import { useAttract } from "@/lib/idle";
import { useStore } from "@/lib/store";
import { visit } from "@/lib/visit";
import styles from "./decide.module.css";

const istHour = () => Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(new Date())) % 24;

/**
 * P5, Decide: the patch bay. Rules decide the trigger, the template and the moment.
 * Consent and suppression are welded in; the others can be re-patched or bypassed to
 * show what each is for. Hold to run the patch and read the trace.
 */
export function Decide() {
  const root = useRef<HTMLDivElement>(null);
  const consent = useStore(identity, (s) => s.consent);
  const [rules, setRules] = useState<Omit<Rules, "consent">>({ hour: 14, sentToday: 0, inHoldout: false });
  const [runId, setRunId] = useState(0);
  const [trace, setTrace] = useState<Step[]>([]);
  const [done, setDone] = useState(false);
  const all = { ...rules, consent };

  // the clock on the quiet-hours module starts at the visitor's own hour in Hyderabad
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hour is only known on the client
    setRules((r) => ({ ...r, hour: istHour() }));
  }, []);

  useAttract(root, () => setRunId((n) => n + 1), 5200);

  return (
    <section id="decide" className={styles.station} aria-label="04 Decide">
      <div ref={root} className={styles.sticky} data-motion-own>
        <header className={styles.head}>
          <span className={styles.index} aria-hidden>
            04
          </span>
          <span className={`${styles.where} t-hud`}>
            <span>Decide</span>
            <span className={styles.clock}>3:00</span>
            <span className="c-muted">UPI_TIMEOUT: the gateway says why</span>
          </span>
        </header>
        <div className={styles.copy}>
          <h2 className={styles.title}>Rules decide. The holdout gets the last word.</h2>
          <p className={styles.lede}>
            Pick an event, re-patch the rules, then hold to run it. Consent and suppression are welded in; holdout, the frequency cap and
            quiet hours can be moved or bypassed, so you can see what each one is for.
          </p>
          <HoldToConfirm onConfirm={() => setRunId((n) => n + 1)} size="l" doneLabel="Running">
            Hold to run the patch
          </HoldToConfirm>
          <ol className={styles.trace} aria-label="Trace of the last run" aria-live="polite">
            {trace.length === 0 ? <li className={styles.empty}>The trace of each run appears here.</li> : null}
            {trace.map((s, i) => (
              <li key={i} data-result={s.result}>
                <span className={`${styles.at} t-hud`}>{s.at === "entry" ? "event" : s.at}</span>
                <span className={styles.what}>{s.text}</span>
              </li>
            ))}
          </ol>
          <p className={`${styles.note} t-small`}>{done ? "Rules and values are examples, in the order the business report lists them." : " "}</p>
        </div>
        <div className={styles.bayWrap}>
          <PatchBay
            rules={all}
            onRules={(r) => setRules((x) => ({ ...x, ...r }))}
            runId={runId}
            onTrace={(steps, finished) => {
              setTrace(steps);
              setDone(finished);
            }}
            onRunEnd={(sent, everyRule) => visit.set({ allRules: everyRule, lastSent: sent })}
          />
        </div>
      </div>
    </section>
  );
}
