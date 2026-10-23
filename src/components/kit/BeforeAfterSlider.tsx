"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import styles from "./BeforeAfterSlider.module.css";

type Props = {
  label: string;
  before: ReactNode;
  after: ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
  /** where the divider starts, 0..1 from the left */
  initial?: number;
  className?: string;
  style?: CSSProperties;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Two states of the same thing, split by a divider you drag (or move with the arrow
 * keys). The first time it comes into view the divider swings once, to show it moves.
 */
export function BeforeAfterSlider({ label, before, after, beforeLabel = "Before", afterLabel = "After", initial = 0.5, className, style }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(initial);
  const xRef = useRef(initial);
  const dragging = useRef(false);

  const set = (v: number) => {
    const next = clamp01(v);
    xRef.current = next;
    setX(next);
  };

  // the swing, once
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        const proxy = { v: xRef.current };
        gsap
          .timeline({ delay: 0.4 })
          .to(proxy, { v: initial + 0.16, duration: 0.7, ease: "drift", onUpdate: () => !dragging.current && set(proxy.v) })
          .to(proxy, { v: initial - 0.1, duration: 0.8, ease: "drift", onUpdate: () => !dragging.current && set(proxy.v) })
          .to(proxy, { v: initial, duration: 0.6, ease: "glide", onUpdate: () => !dragging.current && set(proxy.v) });
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [initial]);

  const fromEvent = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return (e.clientX - r.left) / r.width;
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    set(fromEvent(e));
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) set(fromEvent(e));
  };
  const onUp = () => {
    if (dragging.current) sfx.detent();
    dragging.current = false;
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -0.02, ArrowRight: 0.02, PageDown: -0.1, PageUp: 0.1 }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      set(xRef.current + step);
    } else if (e.key === "Home") {
      e.preventDefault();
      set(0);
    } else if (e.key === "End") {
      e.preventDefault();
      set(1);
    }
  };

  return (
    <div
      ref={root}
      className={`${styles.ba} ${className ?? ""}`}
      style={{ ...style, "--x": x } as CSSProperties}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      data-cursor="drag"
      data-motion-own
    >
      <div className={styles.after}>{after}</div>
      <div className={styles.before} aria-hidden={x < 0.02 || undefined}>
        {before}
      </div>
      <span className={`${styles.tag} ${styles.tagBefore} t-hud`}>{beforeLabel}</span>
      <span className={`${styles.tag} ${styles.tagAfter} t-hud`}>{afterLabel}</span>
      <div
        className={styles.divider}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(x * 100)}
        aria-valuetext={`${Math.round(x * 100)} percent ${beforeLabel.toLowerCase()}`}
        onKeyDown={onKey}
      >
        <span className={styles.grip} aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
