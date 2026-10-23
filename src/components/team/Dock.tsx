"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type KeyboardEvent } from "react";
import { displayName, type Member } from "@/data/team";
import { gsap, prefersReducedMotion, springStep, SPRING } from "@/lib/motion";
import { Portrait } from "./Portrait";
import styles from "./Dock.module.css";

type Props = {
  team: Member[];
  active: number;
  touch: boolean;
  onPreview: (i: number) => void;
  onOpen: (i: number) => void;
  onLeave: () => void;
};

export type DockHandle = { thumb: (i: number) => HTMLElement | null };

/**
 * The portraits as a dock: the one under the pointer magnifies and lifts on a spring,
 * its neighbours part. A segmented bright-line reticle snaps to the selected one.
 * On touch screens the dock is a snapping carousel and a tap selects.
 */
export const Dock = forwardRef<DockHandle, Props>(function Dock({ team, active, touch, onPreview, onOpen, onLeave }, ref) {
  const root = useRef<HTMLDivElement>(null);
  const reticle = useRef<HTMLSpanElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useImperativeHandle(ref, () => ({ thumb: (i) => buttons.current[i] ?? null }), []);

  // magnification by pointer proximity, integrated on springs
  useEffect(() => {
    const el = root.current;
    if (!el || touch || prefersReducedMotion()) return;
    const s = team.map(() => ({ x: 1, v: 0, t: 1 }));
    let px = -9999;
    const move = (e: PointerEvent) => {
      px = e.clientX;
    };
    const leave = () => {
      px = -9999;
    };
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      buttons.current.forEach((b, i) => {
        if (!b) return;
        const r = b.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const d = (px - cx) / 110;
        s[i].t = 1 + 0.5 * Math.exp(-d * d);
        [s[i].x, s[i].v] = springStep(s[i].x, s[i].v, s[i].t, SPRING.dock, dt);
        b.style.setProperty("--s", s[i].x.toFixed(3));
      });
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    gsap.ticker.add(tick);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      gsap.ticker.remove(tick);
    };
  }, [team, touch]);

  // the reticle follows the selection with the decisive ease
  useEffect(() => {
    const el = root.current;
    const r = reticle.current;
    const b = buttons.current[active];
    if (!el || !r) return;
    if (!b) {
      r.dataset.on = "0";
      return;
    }
    const place = () => {
      const box = el.getBoundingClientRect();
      const tb = b.getBoundingClientRect();
      r.style.transform = `translate(${tb.left - box.left - 8 + el.scrollLeft}px, ${tb.top - box.top - 8}px)`;
      r.style.width = `${tb.width + 16}px`;
      r.style.height = `${tb.height + 16}px`;
    };
    r.dataset.on = "1";
    place();
    const id = window.setInterval(place, 120);
    const t = window.setTimeout(() => window.clearInterval(id), 900);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(t);
    };
  }, [active]);

  const onKey = (e: KeyboardEvent, i: number) => {
    const n = team.length;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const j = (i + 1) % n;
      buttons.current[j]?.focus();
      onPreview(j);
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const j = (i - 1 + n) % n;
      buttons.current[j]?.focus();
      onPreview(j);
    }
    if (e.key === "Home") {
      e.preventDefault();
      buttons.current[0]?.focus();
      onPreview(0);
    }
    if (e.key === "End") {
      e.preventDefault();
      buttons.current[n - 1]?.focus();
      onPreview(n - 1);
    }
  };

  return (
    <div ref={root} className={styles.dock} data-touch={touch ? "1" : undefined} role="group" aria-label="The team" onPointerLeave={touch ? undefined : onLeave}>
      {team.map((m, i) => (
        <button
          key={m.slug}
          ref={(b) => {
            buttons.current[i] = b;
          }}
          type="button"
          className={styles.thumb}
          aria-pressed={i === active}
          aria-label={`${displayName(m)}, ${m.role}. Press Enter for the dossier.`}
          tabIndex={i === Math.max(0, active) ? 0 : -1}
          onPointerEnter={touch ? undefined : () => onPreview(i)}
          onFocus={touch ? undefined : () => onPreview(i)}
          onClick={() => (touch && i !== active ? onPreview(i) : onOpen(i))}
          onKeyDown={(e) => onKey(e, i)}
          data-cursor="open"
          data-cursor-label="Dossier"
        >
          <span className={styles.frame}>
            <Portrait member={m} className={styles.img} />
          </span>
          <span className={`${styles.cap} t-hud`}>
            <span className={styles.n}>{String(i + 1).padStart(2, "0")}</span>
            {m.roleShort}
          </span>
        </button>
      ))}
      <span ref={reticle} className={styles.reticle} data-on="0" aria-hidden>
        <i />
        <i />
        <i />
        <i />
        <b />
        <b />
      </span>
    </div>
  );
});
