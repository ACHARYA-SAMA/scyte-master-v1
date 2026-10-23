"use client";

import { useEffect, useRef } from "react";
import { gsap, springStep, SPRING } from "@/lib/motion";
import { ui, useStore, type CursorState } from "@/lib/store";
import styles from "./Cursor.module.css";

/**
 * A viewfinder, not a blob: a square point and four bright-line corners that frame
 * whatever is under them. Elements choose the verb with data-cursor (drag, tap, scrub,
 * open, hold, view) and may override the label with data-cursor-label. Elements with
 * data-magnetic pull the frame to their centre and lean towards the pointer.
 */

const LABELS: Partial<Record<CursorState, string>> = {
  drag: "Drag",
  tap: "Tap",
  scrub: "Scrub",
  open: "Open",
  hold: "Hold",
  view: "View",
};

const VERBS = new Set<CursorState>(["drag", "tap", "scrub", "open", "hold", "view", "hidden", "link"]);

const resolve = (el: Element | null): { state: CursorState; label: string; magnet: HTMLElement | null } => {
  if (!el) return { state: "default", label: "", magnet: null };
  const magnet = el.closest<HTMLElement>("[data-magnetic]");
  const tagged = el.closest<HTMLElement>("[data-cursor]");
  if (el.closest("input, textarea, select, [contenteditable='true']")) return { state: "hidden", label: "", magnet: null };
  if (tagged) {
    const s = tagged.dataset.cursor as CursorState;
    if (VERBS.has(s)) return { state: s, label: tagged.dataset.cursorLabel ?? LABELS[s] ?? "", magnet };
  }
  if (el.closest("a, button, [role='button'], label, summary")) return { state: "link", label: "", magnet };
  return { state: "default", label: "", magnet: null };
};

export function Cursor() {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const state = useStore(ui, (s) => s.cursor);
  const text = useStore(ui, (s) => s.cursorLabel);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    if (!fine.matches) return;
    const html = document.documentElement;
    html.classList.add("has-cursor");

    const p = { x: -100, y: -100 };
    const f = { x: -100, y: -100, vx: 0, vy: 0, w: 30, vw: 0, h: 30, vh: 0 };
    let magnet: HTMLElement | null = null;
    let magnetRect: DOMRect | null = null;
    let shown = false;
    let lastState: CursorState = "default";

    const setMagnet = (next: HTMLElement | null) => {
      if (magnet === next) return;
      if (magnet) gsap.to(magnet, { x: 0, y: 0, duration: 0.5, ease: "glide", overwrite: true });
      magnet = next;
      magnetRect = next?.getBoundingClientRect() ?? null;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      p.x = e.clientX;
      p.y = e.clientY;
      if (!shown) {
        shown = true;
        f.x = p.x;
        f.y = p.y;
        root.current?.setAttribute("data-shown", "1");
      }
      const hit = resolve(e.target as Element);
      const g = ui.get();
      if (hit.state === "default" && g.glCursor) {
        hit.state = g.glCursor;
        hit.label = g.glCursorLabel || LABELS[g.glCursor] || "";
      }
      if (hit.state !== lastState || hit.state !== ui.get().cursor || hit.label !== ui.get().cursorLabel) {
        lastState = hit.state;
        ui.set({ cursor: hit.state, cursorLabel: hit.label });
      }
      setMagnet(hit.magnet);
      if (magnet && magnetRect) {
        const cx = magnetRect.left + magnetRect.width / 2;
        const cy = magnetRect.top + magnetRect.height / 2;
        gsap.to(magnet, { x: (p.x - cx) * 0.22, y: (p.y - cy) * 0.28, duration: 0.45, ease: "glide", overwrite: true });
      }
    };
    const onLeave = () => {
      shown = false;
      root.current?.removeAttribute("data-shown");
      setMagnet(null);
    };
    const onScroll = () => {
      if (magnet) magnetRect = magnet.getBoundingClientRect();
    };
    const onDown = () => root.current?.setAttribute("data-down", "1");
    const onUp = () => root.current?.removeAttribute("data-down");

    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const s = ui.get().cursor;
      const lbl = label.current;
      let tx = p.x;
      let ty = p.y;
      let tw = 30;
      let th = 30;
      if (s === "link") {
        tw = 22;
        th = 22;
      } else if (LABELS[s]) {
        tw = Math.max(64, (lbl?.offsetWidth ?? 40) + 26);
        th = 30;
      }
      if (magnet && magnetRect && s !== "default") {
        // the frame wraps a small magnetic target, or sits between pointer and centre
        const cx = magnetRect.left + magnetRect.width / 2;
        const cy = magnetRect.top + magnetRect.height / 2;
        const small = magnetRect.width < 220 && magnetRect.height < 90;
        if (small && s === "link") {
          tx = cx + (p.x - cx) * 0.22;
          ty = cy + (p.y - cy) * 0.28;
          tw = magnetRect.width + 14;
          th = magnetRect.height + 12;
        }
      }
      [f.x, f.vx] = springStep(f.x, f.vx, tx, SPRING.magnet, dt);
      [f.y, f.vy] = springStep(f.y, f.vy, ty, SPRING.magnet, dt);
      [f.w, f.vw] = springStep(f.w, f.vw, tw, SPRING.snap, dt);
      [f.h, f.vh] = springStep(f.h, f.vh, th, SPRING.snap, dt);
      if (frame.current) {
        frame.current.style.transform = `translate3d(${f.x - f.w / 2}px, ${f.y - f.h / 2}px, 0)`;
        frame.current.style.width = `${f.w}px`;
        frame.current.style.height = `${f.h}px`;
      }
      if (dot.current) dot.current.style.transform = `translate3d(${p.x - 2.5}px, ${p.y - 2.5}px, 0)`;
      if (bar.current) bar.current.style.transform = `scaleX(${ui.get().hold})`;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    gsap.ticker.add(tick);
    return () => {
      html.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      gsap.ticker.remove(tick);
      setMagnet(null);
    };
  }, []);

  const shownLabel = text || LABELS[state] || "";

  return (
    <div ref={root} className={styles.root} data-state={state} aria-hidden>
      <div ref={frame} className={styles.frame}>
        <i />
        <i />
        <i />
        <i />
        <span ref={label} className={styles.label}>
          {shownLabel}
        </span>
        <span ref={bar} className={styles.bar} />
      </div>
      <div ref={dot} className={styles.dot} />
    </div>
  );
}
