"use client";

import { useEffect, useRef, type ElementType } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./TypeBreather.module.css";

type Axes = { wght: number; wdth: number };

type Props = {
  /** lines separated by "\n"; each line stays on one line so the reflow never re-breaks it */
  text: string;
  as?: ElementType;
  className?: string;
  /** the axes at rest */
  rest?: Axes;
  /** the axes a letter reaches right under the pointer */
  peak?: Axes;
  /** how far the pointer reaches, in px */
  radius?: number;
  /** the calm idle breath that runs across the letters */
  breathe?: boolean;
  id?: string;
};

/**
 * A headline that breathes on Archivo's two axes. Letters near the pointer swell
 * towards `peak` (wider and heavier, or narrower, as the page wants); a fast scroll
 * squeezes the whole line, the way type would compress under load; and at rest a slow
 * wave runs through it. Only one style write per letter per frame, inside a contained
 * box, and only while it is on screen.
 */
export function TypeBreather({ text, as: Tag = "h1", className, rest = { wght: 760, wdth: 80 }, peak = { wght: 900, wdth: 112 }, radius = 220, breathe = true, id }: Props) {
  const root = useRef<HTMLElement>(null);
  const lines = text.split("\n");

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const chars = Array.from(el.querySelectorAll<HTMLElement>("[data-ch]"));
    const n = chars.length;
    const cx = new Float32Array(n);
    const cy = new Float32Array(n);
    const wg = new Float32Array(n).fill(rest.wght);
    const wd = new Float32Array(n).fill(rest.wdth);
    const written = new Float32Array(n * 2).fill(-1);
    let box = { left: 0, top: 0 };
    const fine = window.matchMedia("(pointer: fine)").matches;

    const measure = () => {
      const r = el.getBoundingClientRect();
      box = { left: r.left + window.scrollX, top: r.top + window.scrollY };
      chars.forEach((c, i) => {
        const cr = c.getBoundingClientRect();
        cx[i] = cr.left + cr.width / 2 - r.left;
        cy[i] = cr.top + cr.height / 2 - r.top;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    void document.fonts.ready.then(measure);

    const pointer = { x: -1e5, y: -1e5 };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.x = e.pageX;
      pointer.y = e.pageY;
    };
    let lastY = window.scrollY;
    let vel = 0;
    const onScroll = () => {
      const y = window.scrollY;
      vel += Math.abs(y - lastY);
      lastY = y;
    };
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    let visible = false;
    const io = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting);
      if (visible) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    });
    io.observe(el);

    let squeeze = 0;
    const tick = (time: number, deltaMs: number) => {
      const dt = Math.min(0.05, deltaMs / 1000);
      // scroll speed this frame, smoothed into a squeeze that relaxes on its own
      squeeze += (Math.min(1, vel / 60) - squeeze) * (1 - Math.exp(-dt * 6));
      vel = 0;
      const px = pointer.x - box.left;
      const py = pointer.y - box.top;
      const k = 1 - Math.exp(-dt * 10);
      for (let i = 0; i < n; i++) {
        const dx = px - cx[i]!;
        const dy = (py - cy[i]!) * 1.6;
        const near = fine ? Math.exp(-(dx * dx + dy * dy) / (radius * radius)) : 0;
        const wave = breathe ? Math.sin(time * 1.15 - i * 0.32) : 0;
        const tw = rest.wght + (peak.wght - rest.wght) * near + wave * 26 + squeeze * 90;
        const td = rest.wdth + (peak.wdth - rest.wdth) * near + wave * 3 - squeeze * 14;
        wg[i] = wg[i]! + (tw - wg[i]!) * k;
        wd[i] = wd[i]! + (td - wd[i]!) * k;
        const w = Math.round(Math.min(900, Math.max(100, wg[i]!)));
        const d = Math.round(Math.min(125, Math.max(62, wd[i]!)) * 2) / 2;
        if (written[i * 2] !== w || written[i * 2 + 1] !== d) {
          written[i * 2] = w;
          written[i * 2 + 1] = d;
          chars[i]!.style.fontVariationSettings = `"wght" ${w}, "wdth" ${d}`;
        }
      }
    };

    return () => {
      io.disconnect();
      ro.disconnect();
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      chars.forEach((c) => (c.style.fontVariationSettings = ""));
    };
  }, [text, rest.wght, rest.wdth, peak.wght, peak.wdth, radius, breathe]);

  return (
    <Tag ref={root} id={id} className={`${styles.breather} ${className ?? ""}`} aria-label={lines.join(" ")} data-motion-own>
      {lines.map((line, li) => (
        <span key={li} className={styles.line} aria-hidden>
          {line.split(" ").map((word, wi, words) => (
            <span key={wi} className={styles.word}>
              {[...word].map((c, ci) => (
                <span key={ci} data-ch style={{ fontVariationSettings: `"wght" ${rest.wght}, "wdth" ${rest.wdth}` }}>
                  {c}
                </span>
              ))}
              {wi < words.length - 1 ? " " : null}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  );
}
