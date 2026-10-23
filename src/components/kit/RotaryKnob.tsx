"use client";

import { useCallback, useEffect, useId, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { gsap, prefersReducedMotion, springStep } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import styles from "./RotaryKnob.module.css";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  /** the detent: values snap to it and each one clicks */
  step: number;
  onChange: (v: number) => void;
  /** the readout under the knob */
  format?: (v: number) => string;
  /** how many tick marks around the dial; defaults to one per detent, up to 41 */
  ticks?: number;
  size?: "s" | "m" | "l";
  disabled?: boolean;
  /** a short note under the readout, e.g. the unit or the source */
  hint?: string;
  className?: string;
};

/** The dial sweeps 270 degrees, from seven to five o'clock. */
const SWEEP = 270;
const START = -135;
/** Pixels of vertical drag for the full range. */
const TRAVEL = 220;
const DIAL = { stiffness: 520, damping: 30, mass: 0.5 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A rotary control with detents. Drag up or down (or around the dial), scroll the wheel,
 * or use the arrow keys, Page Up/Down, Home and End. Each detent passed clicks and, on
 * phones, taps the haptics. The dial chases the value on a stiff spring, so a fast
 * turn overshoots a hair and settles, like a real knob with mass.
 */
export function RotaryKnob({ label, value, min, max, step, onChange, format = (v) => String(v), ticks, size = "m", disabled, hint, className }: Props) {
  const id = useId();
  const dial = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const shown = useRef({ a: 0, v: 0, init: false });
  const valueRef = useRef(value);
  const lastClick = useRef(0);

  const frac = (v: number) => (max === min ? 0 : (v - min) / (max - min));
  const snap = useCallback((v: number) => clamp(Math.round((v - min) / step) * step + min, min, max), [min, max, step]);

  const commit = useCallback(
    (raw: number) => {
      const next = snap(raw);
      if (next === valueRef.current) return;
      const passed = Math.abs(next - valueRef.current) / step;
      valueRef.current = next;
      onChange(next);
      const now = performance.now();
      if (now - lastClick.current > 28) {
        lastClick.current = now;
        sfx.detent();
        if (passed >= 1) haptic(4);
      }
    },
    [onChange, snap, step],
  );

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // the dial's angle springs towards the value
  useEffect(() => {
    const el = dial.current;
    if (!el) return;
    const target = () => START + frac(valueRef.current) * SWEEP;
    if (prefersReducedMotion()) {
      el.style.setProperty("--a", `${target()}deg`);
      return;
    }
    let last = performance.now();
    let running = true;
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = target();
      const [a, v] = springStep(shown.current.a, shown.current.v, t, DIAL, dt);
      shown.current.a = a;
      shown.current.v = v;
      el.style.setProperty("--a", `${a.toFixed(2)}deg`);
      if (Math.abs(a - t) < 0.02 && Math.abs(v) < 0.05) {
        el.style.setProperty("--a", `${t}deg`);
        gsap.ticker.remove(tick);
        running = false;
      }
    };
    // the first render starts at rest on the value; later changes spring
    if (!shown.current.init) {
      shown.current.init = true;
      shown.current.a = target();
    }
    gsap.ticker.add(tick);
    return () => {
      if (running) gsap.ticker.remove(tick);
    };
    // frac depends on min and max only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max]);

  const drag = useRef<{ y: number; x: number; v: number; angular: boolean; startAngle: number; cx: number; cy: number } | null>(null);

  const angleAt = (x: number, y: number, cx: number, cy: number) => (Math.atan2(x - cx, cy - y) * 180) / Math.PI;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    // grabbing the rim turns the dial around its centre; grabbing the cap drags vertically
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
    const angular = dist > r.width * 0.32;
    drag.current = { y: e.clientY, x: e.clientX, v: valueRef.current, angular, startAngle: angleAt(e.clientX, e.clientY, cx, cy), cx, cy };
    e.currentTarget.setPointerCapture(e.pointerId);
    root.current?.setAttribute("data-active", "1");
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const range = max - min;
    if (d.angular) {
      let delta = angleAt(e.clientX, e.clientY, d.cx, d.cy) - d.startAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      commit(d.v + (delta / SWEEP) * range);
    } else {
      const dy = d.y - e.clientY + (e.clientX - d.x) * 0.35;
      commit(d.v + (dy / TRAVEL) * range);
    }
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    root.current?.removeAttribute("data-active");
  };

  // the wheel turns it, only while the pointer is on the dial, and never scrolls the page
  useEffect(() => {
    const el = dial.current?.parentElement;
    if (!el || disabled) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      commit(valueRef.current + dir * step);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [commit, step, disabled]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const big = Math.max(step, (max - min) / 10);
    const map: Record<string, number> = {
      ArrowUp: step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowLeft: -step,
      PageUp: big,
      PageDown: -big,
    };
    if (e.key in map) {
      e.preventDefault();
      commit(valueRef.current + (map[e.key] ?? 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      commit(min);
    } else if (e.key === "End") {
      e.preventDefault();
      commit(max);
    }
  };

  const count = ticks ?? Math.min(41, Math.round((max - min) / step) + 1);
  const lit = frac(value);
  const marks = Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    const a = START + t * SWEEP;
    const major = i === 0 || i === count - 1 || (count > 10 && i % 5 === 0);
    return { a, on: t <= lit + 1e-6, major, i };
  });

  return (
    <div ref={root} className={`${styles.knob} ${className ?? ""}`} data-size={size} data-disabled={disabled ? "1" : undefined}>
      <span id={`${id}-l`} className={`${styles.label} t-hud`}>
        {label}
      </span>
      <div
        className={styles.body}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-labelledby={`${id}-l`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        aria-disabled={disabled || undefined}
        data-cursor="turn"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <svg className={styles.ticks} viewBox="-50 -50 100 100" aria-hidden>
          {marks.map((m) => (
            <line
              key={m.i}
              x1={0}
              y1={m.major ? -49 : -47.5}
              x2={0}
              y2={-43}
              transform={`rotate(${m.a})`}
              data-on={m.on ? "1" : undefined}
              data-major={m.major ? "1" : undefined}
            />
          ))}
          <path className={styles.arc} d={arcPath(START, START + lit * SWEEP, 40)} />
        </svg>
        <div ref={dial} className={styles.dial} style={{ "--a": `${START + lit * SWEEP}deg` } as CSSProperties}>
          <span className={styles.knurl} />
          <span className={styles.cap} />
          <span className={styles.pointer} />
        </div>
      </div>
      <output className={`${styles.readout} t-fig`} aria-hidden>
        {format(value)}
      </output>
      {hint ? <span className={`${styles.hint} t-small`}>{hint}</span> : null}
    </div>
  );
}

/** An SVG arc on a circle of radius r, between two dial angles (0 is twelve o'clock). */
const arcPath = (a0: number, a1: number, r: number) => {
  if (a1 - a0 < 0.5) return "";
  const p = (a: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return `${(Math.cos(rad) * r).toFixed(2)} ${(Math.sin(rad) * r).toFixed(2)}`;
  };
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p(a0)} A ${r} ${r} 0 ${large} 1 ${p(a1)}`;
};
