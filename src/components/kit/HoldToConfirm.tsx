"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { ui } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import styles from "./HoldToConfirm.module.css";

type Props = {
  /** what holding does, e.g. "Send" or "Run the patch" */
  children: ReactNode;
  onConfirm: () => void;
  /** how long to hold, ms */
  duration?: number;
  doneLabel?: ReactNode;
  disabled?: boolean;
  size?: "m" | "l";
  className?: string;
};

const RING = 2 * Math.PI * 22;

/**
 * A button that commits only when held: a ring fills around it while the pointer, or
 * Space or Enter, is held down, and it fires when the ring closes. Let go early and the
 * ring drains. For actions that should not happen by accident: sending, running.
 */
export function HoldToConfirm({ children, onConfirm, duration = 1100, doneLabel = "Done", disabled, size = "m", className }: Props) {
  const id = useId();
  const root = useRef<HTMLButtonElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const state = useRef({ p: 0, holding: false, fired: false, last: 0, lastTick: 0 });
  const [done, setDone] = useState(false);
  const cb = useRef(onConfirm);
  useEffect(() => {
    cb.current = onConfirm;
  });

  // the fill loop: runs while the ring is filling or draining, then removes itself
  const loop = useRef<{ start: () => void; step: () => void } | null>(null);
  useEffect(() => {
    let alive = false;
    const draw = () => {
      const p = state.current.p;
      ring.current?.style.setProperty("stroke-dashoffset", String(RING * (1 - p)));
      root.current?.style.setProperty("--p", p.toFixed(3));
      ui.set({ hold: state.current.holding ? p : 0 });
    };
    const tick = () => {
      const s = state.current;
      const now = performance.now();
      const dt = now - s.last;
      s.last = now;
      if (s.holding) s.p = Math.min(1, s.p + dt / duration);
      else s.p = Math.max(0, s.p - (dt / duration) * 3);
      // a faint ratchet while the ring fills
      if (s.holding && now - s.lastTick > 90) {
        s.lastTick = now;
        sfx.tick();
      }
      draw();
      if (s.p >= 1 && !s.fired) {
        s.fired = true;
        s.holding = false;
        sfx.ok();
        haptic([10, 30, 10]);
        setDone(true);
        cb.current();
        window.setTimeout(() => {
          setDone(false);
          s.fired = false;
          s.p = 0;
          draw();
        }, 1600);
      }
      if (!s.holding && s.p <= 0) {
        gsap.ticker.remove(tick);
        alive = false;
      }
    };
    loop.current = {
      start: () => {
        if (alive) return;
        alive = true;
        gsap.ticker.add(tick);
      },
      step: tick,
    };
    return () => {
      gsap.ticker.remove(tick);
      loop.current = null;
      ui.set({ hold: 0 });
    };
  }, [duration]);

  const press = () => {
    if (disabled || state.current.fired) return;
    // with reduced motion there is no fill to watch: a press commits
    if (prefersReducedMotion()) {
      state.current.p = 1;
      state.current.holding = true;
      state.current.last = performance.now();
      loop.current?.step();
      return;
    }
    state.current.holding = true;
    state.current.last = performance.now();
    loop.current?.start();
  };
  const release = () => {
    state.current.holding = false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      press();
    }
  };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      release();
    }
  };

  return (
    <button
      ref={root}
      type="button"
      className={`${styles.hold} ${className ?? ""}`}
      data-size={size}
      data-done={done ? "1" : undefined}
      disabled={disabled}
      aria-describedby={`${id}-hint`}
      data-cursor="hold"
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onClick={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg className={styles.ring} viewBox="0 0 48 48" aria-hidden>
        <circle className={styles.track} cx="24" cy="24" r="22" />
        <circle ref={ring} className={styles.fillRing} cx="24" cy="24" r="22" strokeDasharray={RING} strokeDashoffset={RING} />
      </svg>
      <span className={styles.text}>{done ? doneLabel : children}</span>
      <span id={`${id}-hint`} className="sr-only">
        Press and hold to confirm.
      </span>
    </button>
  );
}
