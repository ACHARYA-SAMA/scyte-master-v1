"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import styles from "./Odometer.module.css";

type Props = {
  value: number;
  /** Indian grouping (12,34,567) by default, as every rupee figure on the site */
  locale?: string;
  prefix?: string;
  suffix?: string;
  /** fraction digits */
  decimals?: number;
  /** seconds the slowest wheel takes to land */
  duration?: number;
  /** roll the last wheel a hair and back now and then, so a still figure breathes */
  breathe?: boolean;
  /** tick as the units wheel passes each digit (off for figures that change constantly) */
  sound?: boolean;
  className?: string;
};

const place = (strip: HTMLElement, w: number) => {
  const m = ((w % 10) + 10) % 10;
  strip.style.transform = `translateY(${(-m).toFixed(3)}em)`;
};

/**
 * Rolling-digit figures. Each digit is a wheel; when the value changes, each wheel turns
 * to its new digit, the low wheels spinning through extra turns for a big change and
 * the high wheels landing last, so the carry ripples leftwards. The figure is real text
 * for screen readers; the wheels are aria-hidden.
 */
export function Odometer({ value, locale = "en-IN", prefix = "", suffix = "", decimals = 0, duration = 1.25, breathe, sound = true, className }: Props) {
  const fmt = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }), [locale, decimals]);
  const text = fmt.format(value);
  const root = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  /** where each wheel last came to rest, by place from the right (0 is the last digit) */
  const rest = useRef<number[]>([]);
  const chars = [...text];

  // before paint, so a changed digit never flashes at its new place before it rolls
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const strips = Array.from(el.querySelectorAll<HTMLElement>("[data-strip]"));
    const from = prev.current;
    prev.current = value;
    const reduced = prefersReducedMotion();
    const delta = value - from;
    const count = strips.length;
    const tweens: gsap.core.Tween[] = [];
    const targets = strips.map((s) => Number(s.dataset.digit));
    const resting = rest.current;
    strips.forEach((strip, i) => {
      const p = count - 1 - i;
      const target = targets[i] ?? 0;
      const current = resting[p] ?? target;
      if (reduced || from === value) {
        resting[p] = target;
        place(strip, target);
        return;
      }
      // a wheel only turns extra laps when the change is big enough to carry through it
      const unit = 10 ** (p - decimals);
      const laps = Math.min(3, Math.floor(Math.abs(delta) / (unit * 10)));
      const dir = delta >= 0 ? 1 : -1;
      let end = target;
      if (dir > 0 && end < current) end += 10;
      if (dir < 0 && end > current) end -= 10;
      end += dir * 10 * laps;
      place(strip, current);
      if (end === current) return;
      const proxy = { w: current };
      let whole = Math.floor(current);
      tweens.push(
        gsap.to(proxy, {
          w: end,
          duration: duration * (0.5 + 0.5 * Math.min(1, p / 5)),
          delay: p * 0.05,
          ease: "glide",
          onUpdate: () => {
            place(strip, proxy.w);
            const now = Math.floor(proxy.w);
            if (sound && p === 0 && now !== whole) sfx.tick();
            whole = now;
          },
          onComplete: () => {
            resting[p] = target;
          },
        }),
      );
    });
    return () => {
      tweens.forEach((t) => t.kill());
      // a value that changes again mid-roll starts from where each wheel was meant to land
      targets.forEach((t, i) => {
        resting[count - 1 - i] = t;
      });
    };
  }, [value, decimals, duration, sound]);

  // the breath: the last wheel lifts a hair and settles, as if the mechanism were live
  useEffect(() => {
    if (!breathe || prefersReducedMotion()) return;
    const el = root.current;
    const timer = window.setInterval(() => {
      const strips = el?.querySelectorAll<HTMLElement>("[data-strip]");
      const last = strips?.[strips.length - 1];
      if (!last || document.hidden) return;
      const d = Number(last.dataset.digit);
      const proxy = { w: d };
      gsap.to(proxy, { w: d + 0.14, duration: 0.45, ease: "drift", yoyo: true, repeat: 1, onUpdate: () => place(last, proxy.w) });
    }, 2800);
    return () => window.clearInterval(timer);
  }, [breathe]);

  return (
    <span ref={root} className={`${styles.odo} ${className ?? ""}`}>
      <span className="sr-only">
        {prefix}
        {text}
        {suffix}
      </span>
      <span className={styles.face} aria-hidden>
        {prefix ? <span className={styles.fix}>{prefix}</span> : null}
        {chars.map((ch, i) => {
          // keyed by place from the right, so units stay units when the length changes
          const key = chars.length - i;
          if (!/\d/.test(ch))
            return (
              <span key={`s${key}`} className={styles.sep}>
                {ch}
              </span>
            );
          return (
            <span key={`d${key}`} className={styles.wheel}>
              <span className={styles.strip} data-strip data-digit={ch} style={{ "--d": ch } as CSSProperties}>
                {"01234567890".split("").map((d, j) => (
                  <span key={j}>{d}</span>
                ))}
              </span>
              <span className={styles.ghost}>0</span>
            </span>
          );
        })}
        {suffix ? <span className={styles.fix}>{suffix}</span> : null}
      </span>
    </span>
  );
}
