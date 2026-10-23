"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import styles from "./ReceiptPrinter.module.css";

export type ReceiptLine =
  | { kind: "title"; text: string }
  | { kind: "row"; left: string; right?: string; strong?: boolean }
  | { kind: "total"; left: string; right: string }
  | { kind: "rule" }
  | { kind: "note"; text: string }
  | { kind: "space" };

type Props = {
  /** the plate on the printer, e.g. "Paper trail" */
  label: string;
  lines: readonly ReceiptLine[];
  /** bump to print; 0 means nothing has been printed yet */
  printId: number;
  onPrinted?: () => void;
  onTorn?: () => void;
  /** ms per printed line */
  lineMs?: number;
  /** what the empty slot says before anything is printed */
  idleText?: string;
  className?: string;
};

type Phase = "idle" | "printing" | "done" | "torn";

/**
 * A receipt printer. Paper feeds up out of the slot one line at a time, each line
 * struck left to right by the head, with the head's chatter; when it is done, drag the
 * paper up (or press Tear off) and it tears along the serrated edge and falls away.
 * The receipt is real text the whole time, so it reads to assistive technology as a
 * list, not as an animation.
 */
export function ReceiptPrinter({ label, lines, printId, onPrinted, onTorn, lineMs = 150, idleText = "Ready", className }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(0);
  const paper = useRef<HTMLDivElement>(null);
  const led = useRef<HTMLSpanElement>(null);
  const cb = useRef({ onPrinted, onTorn });
  useEffect(() => {
    cb.current = { onPrinted, onTorn };
  });

  // print when asked
  useEffect(() => {
    if (!printId) return;
    const reduced = prefersReducedMotion();
    let n = 0;
    let timer = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a print run is started by the printId prop, not by render
    setPhase("printing");
    setCount(0);
    gsap.set(paper.current, { clearProps: "transform,opacity" });
    if (reduced) {
      setCount(lines.length);
      setPhase("done");
      cb.current.onPrinted?.();
      return;
    }
    const step = () => {
      n += 1;
      setCount(n);
      const line = lines[n - 1];
      if (line && line.kind !== "space" && line.kind !== "rule") sfx.printLine();
      led.current?.animate([{ opacity: 1 }, { opacity: 0.35 }], { duration: lineMs * 0.8 });
      if (n >= lines.length) {
        setPhase("done");
        haptic(6);
        cb.current.onPrinted?.();
        return;
      }
      timer = window.setTimeout(step, lineMs);
    };
    timer = window.setTimeout(step, 260);
    return () => window.clearTimeout(timer);
  }, [printId, lines, lineMs]);

  // each new line feeds the paper up by one line height
  useEffect(() => {
    if (!count || phase !== "printing" || !paper.current) return;
    const row = paper.current.querySelector<HTMLElement>(`[data-line="${count - 1}"]`);
    const h = row?.offsetHeight ?? 18;
    paper.current.animate([{ transform: `translateY(${h}px)` }, { transform: "translateY(0)" }], { duration: lineMs * 0.7, easing: "cubic-bezier(0.3, 0.6, 0.3, 1)" });
    row?.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: lineMs * 0.75, easing: "steps(12, end)" });
  }, [count, phase, lineMs]);

  const tear = useCallback(() => {
    if (phase !== "done" || !paper.current) return;
    sfx.tear();
    haptic([6, 20, 6]);
    setPhase("torn");
    const el = paper.current;
    if (prefersReducedMotion()) {
      setCount(0);
      setPhase("idle");
      cb.current.onTorn?.();
      return;
    }
    gsap
      .timeline({
        onComplete: () => {
          setCount(0);
          setPhase("idle");
          gsap.set(el, { clearProps: "transform,opacity" });
          cb.current.onTorn?.();
        },
      })
      .to(el, { y: -26, rotation: -3, duration: 0.18, ease: "cut" })
      .to(el, { y: 520, x: 60, rotation: 16, opacity: 0, duration: 0.9, ease: "power2.in" });
  }, [phase]);

  // drag the paper up to tear it
  const drag = useRef<{ y: number } | null>(null);
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (phase !== "done") return;
    drag.current = { y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !paper.current) return;
    const dy = Math.min(0, e.clientY - d.y);
    paper.current.style.transform = `translateY(${dy * 0.5}px) rotate(${dy * 0.02}deg)`;
    if (dy < -70) {
      drag.current = null;
      tear();
    }
  };
  const onUp = () => {
    if (!drag.current || !paper.current) return;
    drag.current = null;
    gsap.to(paper.current, { y: 0, rotation: 0, duration: 0.5, ease: "glide", clearProps: "transform" });
  };

  const shown = phase === "idle" ? 0 : count;

  return (
    <div className={`${styles.printer} ${className ?? ""}`} data-phase={phase}>
      <div className={styles.chute}>
        <div
          ref={paper}
          className={styles.paper}
          data-empty={shown === 0 ? "1" : undefined}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          data-cursor={phase === "done" ? "drag" : undefined}
          data-cursor-label={phase === "done" ? "Tear" : undefined}
          aria-busy={phase === "printing"}
        >
          <ul className={styles.lines} aria-label={label}>
            {lines.slice(0, shown).map((l, i) => (
              <li key={i} data-line={i} data-kind={l.kind} className={styles.line}>
                {l.kind === "title" || l.kind === "note" ? <span>{l.text}</span> : null}
                {l.kind === "row" ? (
                  <>
                    <span data-strong={l.strong ? "1" : undefined}>{l.left}</span>
                    {l.right ? <span className={styles.right}>{l.right}</span> : null}
                  </>
                ) : null}
                {l.kind === "total" ? (
                  <>
                    <span>{l.left}</span>
                    <span className={styles.right}>{l.right}</span>
                  </>
                ) : null}
                {l.kind === "rule" ? <span className={styles.rule} aria-hidden /> : null}
                {l.kind === "space" ? <span aria-hidden>&nbsp;</span> : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={styles.housing}>
        <span className={styles.slot} aria-hidden />
        <span className={`${styles.plate} t-hud`}>{label}</span>
        <span className={`${styles.status} t-hud`} aria-live="polite">
          <span ref={led} className={styles.led} aria-hidden />
          {phase === "printing" ? "Printing" : phase === "done" ? "Printed" : idleText}
        </span>
        {phase === "done" ? (
          <button type="button" className={`${styles.tear} t-hud`} onClick={tear}>
            Tear off
          </button>
        ) : null}
      </div>
    </div>
  );
}
