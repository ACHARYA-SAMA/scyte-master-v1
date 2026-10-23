"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Station } from "../Station";
import { identity, refuse, setConsent, stopNow } from "@/components/gl/scenes/identify/identity";
import { toast, ui, useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import styles from "./stations.module.css";

const WORDING = "Send me order updates and offers on WhatsApp";

const stamp = () =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());

/** Press and hold the override: the machine refuses, every time. */
function Override() {
  const [hold, setHold] = useState(0);
  const raf = useRef(0);
  const t0 = useRef(0);
  const stop = () => {
    cancelAnimationFrame(raf.current);
    setHold(0);
    ui.set({ hold: 0 });
  };
  const start = () => {
    if (identity.get().consent) return;
    t0.current = performance.now();
    const step = () => {
      const h = Math.min(1, (performance.now() - t0.current) / 900);
      setHold(h);
      ui.set({ hold: h });
      if (h >= 1) {
        refuse();
        sfx.deny();
        haptic([30, 40, 30]);
        toast("Refused. No consent, no message. Not even from us.");
        stop();
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <button
      type="button"
      className={styles.override}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={stop}
      data-cursor="hold"
      data-cursor-label="Hold"
    >
      Hold to send without consent
      <span className={styles.overrideBar} style={{ transform: `scaleX(${hold})` }} aria-hidden />
    </button>
  );
}

export function Identify() {
  const id = useId();
  const consent = useStore(identity, (s) => s.consent);
  const merged = useStore(identity, (s) => s.merged);
  const stopped = useStore(identity, (s) => s.stopped);
  const [record, setRecord] = useState<string | null>(null);

  return (
    <Station
      id="identify"
      scene="identify"
      index="02"
      name="Identify"
      mark="2:10"
      moment="Checkout: a phone number, then a separate box"
      title="No consent, no message. The gate is physical."
      height="300svh"
      lede={
        <p>
          An anonymous visitor becomes a person only when they agree to it. Aarav types his phone number, then ticks a second box,
          unticked by default. His anonymous history attaches to his number. Until then, events pile up at the gate. Grab one and throw
          it.
        </p>
      }
    >
      <label className={styles.consent} htmlFor={id} data-on={consent ? "1" : undefined}>
        <input
          id={id}
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            if (e.target.checked) {
              setRecord(stamp());
              sfx.ok();
            } else sfx.tick();
          }}
        />
        <span className={styles.box} aria-hidden />
        <span>{WORDING}</span>
      </label>
      {consent && record ? (
        <dl className={styles.record} aria-label="Consent record">
          <div>
            <dt className="t-hud">Who</dt>
            <dd>+91 98••• ••210</dd>
          </div>
          <div>
            <dt className="t-hud">When</dt>
            <dd className="t-num">{record} IST</dd>
          </div>
          <div>
            <dt className="t-hud">Wording</dt>
            <dd>“{WORDING}”</dd>
          </div>
          <div>
            <dt className="t-hud">Channel</dt>
            <dd>Checkout, WhatsApp</dd>
          </div>
        </dl>
      ) : (
        <p className={`${styles.hint} t-small`}>{stopped ? "STOP received. Consent withdrawn, the gate locked at once." : "The gate is locked. Tick the box to open it."}</p>
      )}
      <div className={styles.row}>
        {consent ? (
          <button
            type="button"
            className={styles.stop}
            onClick={() => {
              stopNow();
              sfx.deny();
              toast("STOP honoured. No more marketing messages to this number.");
            }}
          >
            Reply STOP
          </button>
        ) : (
          <Override />
        )}
        <p className={`${styles.stat} t-hud`}>
          Merged into the profile <b className="t-fig">{merged}</b>
        </p>
      </div>
    </Station>
  );
}
