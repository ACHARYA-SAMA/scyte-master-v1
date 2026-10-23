"use client";

import { useCallback, useEffect, useId, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { gsap, prefersReducedMotion, springStep } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import styles from "./LeverSwitch.module.css";

type Props = {
  label: string;
  /** the stops along the slot, top (or left) first */
  positions: readonly string[];
  /** index of the current stop; a pull lever always rests at 0 */
  value?: number;
  onChange?: (index: number) => void;
  /**
   * "select" throws between stops and stays. "pull" is spring-loaded: drag it past
   * the end stop and it latches, fires onPull, then returns; let go early and it
   * springs back.
   */
  mode?: "select" | "pull";
  onPull?: () => void;
  /** how long a pulled lever stays latched before it returns, ms */
  latchMs?: number;
  size?: "m" | "l" | "xl";
  orientation?: "vertical" | "horizontal";
  disabled?: boolean;
  /** shown on the handle's face */
  children?: ReactNode;
  className?: string;
};

/** Underdamped on purpose: a thrown lever overshoots its stop and settles. */
const THROW = { stiffness: 380, damping: 17, mass: 0.7 };
const RETURN = { stiffness: 160, damping: 13, mass: 0.9 };
const PULL_AT = 0.86;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * A lever in a machined slot. Drag the handle, click it, or use the keyboard: arrows
 * move between stops, Space or Enter throws it (or pulls a pull lever). Landing on a
 * stop clunks like a relay; on phones it taps the haptics.
 */
export function LeverSwitch({
  label,
  positions,
  value = 0,
  onChange,
  mode = "select",
  onPull,
  latchMs = 900,
  size = "m",
  orientation = "vertical",
  disabled,
  children,
  className,
}: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const n = Math.max(2, positions.length);
  const at = (i: number) => i / (n - 1);

  // physical state, kept out of React: t is 0..1 along the slot
  const phys = useRef({ t: mode === "pull" ? 0 : at(value), v: 0, target: mode === "pull" ? 0 : at(value), spring: THROW, landed: true, dragging: false, latched: false });
  const cb = useRef({ onChange, onPull });
  useEffect(() => {
    cb.current = { onChange, onPull };
  });

  const write = useCallback(() => {
    root.current?.style.setProperty("--t", phys.current.t.toFixed(4));
  }, []);

  // the spring loop: started by any move, it removes itself once the lever is at rest
  const loop = useRef<{ run: () => void } | null>(null);
  useEffect(() => {
    let running = false;
    const tick = () => {
      const p = phys.current;
      if (p.dragging) return;
      const dt = gsap.ticker.deltaRatio(60) / 60;
      const next = springStep(p.t, p.v, p.target, p.spring, dt);
      p.t = next[0];
      p.v = next[1];
      // the first time it reaches the stop it lands, with a clunk, even if it then overshoots
      if (!p.landed && Math.abs(p.t - p.target) < 0.025) {
        p.landed = true;
        if (p.target > 0 || mode === "select") {
          sfx.relay();
          haptic(10);
        }
      }
      write();
      if (Math.abs(p.t - p.target) < 0.0008 && Math.abs(p.v) < 0.002) {
        p.t = p.target;
        p.v = 0;
        write();
        gsap.ticker.remove(tick);
        running = false;
      }
    };
    loop.current = {
      run: () => {
        if (prefersReducedMotion()) {
          phys.current.t = phys.current.target;
          write();
          return;
        }
        if (running) return;
        running = true;
        gsap.ticker.add(tick);
      },
    };
    return () => {
      gsap.ticker.remove(tick);
      loop.current = null;
    };
  }, [mode, write]);
  const run = useCallback(() => loop.current?.run(), []);

  // a controlled select lever follows its value
  useEffect(() => {
    if (mode !== "select") return;
    const p = phys.current;
    const target = at(value);
    if (Math.abs(p.target - target) < 1e-6) return;
    p.target = target;
    p.spring = THROW;
    p.landed = false;
    run();
    // at() depends on n only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mode, run]);

  useEffect(write, [write]);

  const latch = useCallback(() => {
    const p = phys.current;
    if (p.latched) return;
    p.latched = true;
    p.target = 1;
    p.spring = THROW;
    p.landed = false;
    root.current?.setAttribute("data-latched", "1");
    run();
    sfx.relay();
    haptic([12, 40, 18]);
    cb.current.onPull?.();
    window.setTimeout(() => {
      p.latched = false;
      root.current?.removeAttribute("data-latched");
      p.target = 0;
      p.spring = RETURN;
      p.landed = true;
      run();
    }, latchMs);
  }, [latchMs, run]);

  const choose = useCallback(
    (i: number) => {
      const next = Math.min(n - 1, Math.max(0, i));
      const p = phys.current;
      p.target = at(next);
      p.spring = THROW;
      p.landed = false;
      run();
      if (next !== value) cb.current.onChange?.(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [n, value, run],
  );

  const drag = useRef<{ start: number; t0: number; len: number; moved: boolean } | null>(null);
  const along = (e: PointerEvent) => (orientation === "vertical" ? e.clientY : e.clientX);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled || phys.current.latched) return;
    const r = slot.current?.getBoundingClientRect();
    if (!r) return;
    const len = orientation === "vertical" ? r.height : r.width;
    drag.current = { start: along(e), t0: phys.current.t, len, moved: false };
    phys.current.dragging = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    root.current?.setAttribute("data-active", "1");
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const delta = (along(e) - d.start) / d.len;
    if (Math.abs(delta) > 0.01) d.moved = true;
    const p = phys.current;
    let t = d.t0 + delta;
    // a little resistance past the ends, like a stop under load
    if (t < 0) t = t * 0.25;
    if (t > 1) t = 1 + (t - 1) * 0.25;
    p.t = Math.min(1.04, Math.max(-0.04, t));
    write();
    if (mode === "pull" && p.t >= PULL_AT && !p.latched) {
      drag.current = null;
      p.dragging = false;
      latch();
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    phys.current.dragging = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    root.current?.removeAttribute("data-active");
    if (!d) return;
    const p = phys.current;
    if (mode === "pull") {
      if (!d.moved) latch();
      else {
        // let go early: it creaks back to rest
        p.target = 0;
        p.spring = RETURN;
        p.landed = true;
        sfx.detent();
        run();
      }
      return;
    }
    if (!d.moved) {
      choose((value + 1) % n);
      return;
    }
    choose(Math.round(clamp01(p.t) * (n - 1)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (mode === "pull") {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat) latch();
      }
      return;
    }
    const next = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (next !== undefined) {
      e.preventDefault();
      choose(value + next);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      choose((value + 1) % n);
    } else if (e.key === "Home") {
      e.preventDefault();
      choose(0);
    } else if (e.key === "End") {
      e.preventDefault();
      choose(n - 1);
    }
  };

  const aria =
    mode === "pull"
      ? { role: undefined, "aria-describedby": `${id}-hint` }
      : n === 2
        ? { role: "switch", "aria-checked": value === 1 }
        : { role: "slider", "aria-valuemin": 0, "aria-valuemax": n - 1, "aria-valuenow": value, "aria-valuetext": positions[value] };

  return (
    <div
      ref={root}
      className={`${styles.lever} ${className ?? ""}`}
      data-size={size}
      data-orientation={orientation}
      data-mode={mode}
      data-disabled={disabled ? "1" : undefined}
      style={{ "--n": n } as CSSProperties}
    >
      <span id={`${id}-l`} className={`${styles.label} t-hud`}>
        {label}
      </span>
      <div className={styles.housing}>
        <span className={styles.screw} aria-hidden />
        <span className={styles.screw} aria-hidden />
        <div ref={slot} className={styles.slot}>
          <span className={styles.fill} aria-hidden />
          {positions.map((p, i) => (
            <span key={p} className={styles.stop} style={{ "--at": at(i) } as CSSProperties} data-on={mode === "select" && i === value ? "1" : undefined}>
              <span className={`${styles.stopLabel} t-hud`}>{p}</span>
            </span>
          ))}
          <button
            ref={handle}
            type="button"
            className={styles.handle}
            aria-labelledby={`${id}-l`}
            disabled={disabled}
            data-cursor={mode === "pull" ? "pull" : "drag"}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            {...aria}
          >
            <span className={styles.stem} aria-hidden />
            <span className={styles.grip} aria-hidden>
              <span className={styles.lamp} />
              {children}
            </span>
          </button>
        </div>
        <span className={styles.screw} aria-hidden />
        <span className={styles.screw} aria-hidden />
      </div>
      {mode === "pull" ? (
        <span id={`${id}-hint`} className="sr-only">
          Pull the lever down, or press Space or Enter.
        </span>
      ) : null}
    </div>
  );
}
