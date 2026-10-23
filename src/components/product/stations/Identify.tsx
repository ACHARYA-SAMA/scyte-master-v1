"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Station } from "../Station";
import { identity, refuse, setConsent, stopNow } from "@/components/gl/scenes/identify/identity";
import { toast, ui, useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import { visit } from "@/lib/visit";
import { HoldToConfirm } from "@/components/kit/HoldToConfirm";
import { Merge } from "./Merge";
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
  const verified = useStore(visit, (s) => s.verified);
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
      stage={
        <div className={styles.mergeDock}>
          <Merge when={record} />
        </div>
      }
      lede={
        <p>
          An anonymous visitor becomes a person only when they agree to it. Aarav types his phone number, then ticks a second box,
          unticked by default. His anonymous history attaches to his number. Until then, events pile up at the gate. Grab one and throw
          it.
        </p>
      }
    >
      <div className={styles.otp}>
        <span className="t-hud c-muted">Step 1. The number</span>
        {verified ? (
          <span className={styles.verified}>+91 98••• ••210, verified</span>
        ) : (
          <HoldToConfirm onConfirm={() => visit.set({ verified: true })} doneLabel="Verified">
            Hold to verify the OTP
          </HoldToConfirm>
        )}
      </div>
      <span className="t-hud c-muted">Step 2. A separate box, unticked</span>
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
      {stopped ? <p className={`${styles.hint} t-small`}>STOP received. Consent withdrawn, the gate locked at once.</p> : null}
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
