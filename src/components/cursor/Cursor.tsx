"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { ui, type CursorState } from "@/lib/store";
import { sfx } from "@/lib/sound";
import styles from "./Cursor.module.css";

/**
 * The cursor. One event pixel by default; it grows corner brackets over links, frames
 * a label for "view" and "drag", and becomes a segmented signal ring that snaps onto
 * its target for "lock". It hides over text inputs so the native caret shows.
 *
 * Targets opt in with data-cursor="link|view|drag|lock" and data-cursor-label.
 * Links and buttons get "link" automatically. [data-magnetic] elements lean toward it.
 */
export function Cursor() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const fine = window.matchMedia("(pointer: fine)");
    if (!fine.matches) return;

    document.documentElement.classList.add("has-cursor");
    const reduced = prefersReducedMotion();
    const follow = reduced ? 0.001 : 0.16;
    const xTo = gsap.quickTo(el, "x", { duration: follow, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: follow, ease: "power3.out" });

    let locked: HTMLElement | null = null;
    let magnetic: HTMLElement | null = null;
    let magX: ReturnType<typeof gsap.quickTo> | null = null;
    let magY: ReturnType<typeof gsap.quickTo> | null = null;
    let visible = false;

    const setState = (state: CursorState, label = "") => {
      if (el.dataset.state !== state) {
        el.dataset.state = state;
        if (state === "lock") sfx.lock();
      }
      const labelEl = el.querySelector<HTMLElement>("[data-label]");
      if (labelEl && labelEl.textContent !== label) labelEl.textContent = label;
      ui.set({ cursor: state, cursorLabel: label });
    };

    const resolve = (target: EventTarget | null) => {
      const node = target instanceof Element ? target : null;
      if (!node) return { state: "default" as CursorState, label: "", host: null as HTMLElement | null };
      if (node.closest("input, textarea, select, [contenteditable='true']"))
        return { state: "hidden" as CursorState, label: "", host: null };
      const host = node.closest<HTMLElement>("[data-cursor]");
      if (host) {
        return {
          state: (host.dataset.cursor as CursorState) ?? "link",
          label: host.dataset.cursorLabel ?? "",
          host,
        };
      }
      const link = node.closest<HTMLElement>("a, button, [role='button'], label, summary");
      if (link) return { state: "link" as CursorState, label: "", host: link };
      return { state: "default" as CursorState, label: "", host: null };
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!visible) {
        visible = true;
        gsap.set(el, { x: e.clientX, y: e.clientY });
        el.dataset.visible = "1";
      }
      if (locked) {
        // Locked: stay on the target's centre, lean slightly toward the pointer.
        const r = locked.getBoundingClientRect();
        xTo(r.left + r.width / 2 + (e.clientX - (r.left + r.width / 2)) * 0.12);
        yTo(r.top + r.height / 2 + (e.clientY - (r.top + r.height / 2)) * 0.12);
      } else {
        xTo(e.clientX);
        yTo(e.clientY);
      }
      if (magnetic && magX && magY) {
        const r = magnetic.getBoundingClientRect();
        const strength = Number(magnetic.dataset.magnetic) || 0.28;
        magX((e.clientX - (r.left + r.width / 2)) * strength);
        magY((e.clientY - (r.top + r.height / 2)) * strength);
      }
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const { state, label, host } = resolve(e.target);
      locked = state === "lock" ? host : null;
      setState(state, label);

      const mag = (e.target instanceof Element ? e.target.closest<HTMLElement>("[data-magnetic]") : null) ?? null;
      if (mag !== magnetic) {
        if (magnetic) gsap.to(magnetic, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.45)" });
        magnetic = mag;
        magX = mag ? gsap.quickTo(mag, "x", { duration: 0.5, ease: "power3.out" }) : null;
        magY = mag ? gsap.quickTo(mag, "y", { duration: 0.5, ease: "power3.out" }) : null;
      }
    };

    const onLeaveWindow = () => {
      visible = false;
      el.dataset.visible = "0";
    };
    const onDown = () => (el.dataset.down = "1");
    const onUp = () => (el.dataset.down = "0");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeaveWindow);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      gsap.killTweensOf(el);
    };
  }, []);

  return (
    <div ref={root} className={styles.cursor} data-state="default" data-visible="0" aria-hidden>
      <span className={styles.cell} />
      <span className={styles.brackets}>
        <i />
        <i />
        <i />
        <i />
      </span>
      <svg className={styles.ring} viewBox="0 0 100 100">
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x="47" y="2" width="6" height="12" transform={`rotate(${i * 30} 50 50)`} />
        ))}
      </svg>
      <svg className={styles.arrow} viewBox="0 0 10 10">
        <path d="M2 8 L8 2 M3.5 2 H8 V6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <span className={styles.label} data-label />
    </div>
  );
}
