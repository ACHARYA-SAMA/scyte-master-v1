"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import styles from "./SplitFlapBoard.module.css";

export type FlapRow = { text: string; tone?: "lumen" | "muted" | "cream" };

type Props = {
  /** what the board is, for assistive technology */
  label: string;
  rows: readonly (FlapRow | string)[];
  columns: number;
  /** the order the drums turn through; a character missing from it is shown directly */
  charset?: string;
  /** ms between rows starting, so the board ripples top to bottom */
  rowStagger?: number;
  /** ms for one leaf to fall */
  flipMs?: number;
  size?: "s" | "m" | "l";
  /** announce each change politely (for boards a visitor changes themselves) */
  live?: boolean;
  className?: string;
};

export const FLAP_CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789₹.,:-/%+×→";
/** A drum never turns more than this many leaves to reach its character. */
const MAX_STEPS = 12;

const norm = (r: FlapRow | string): FlapRow => (typeof r === "string" ? { text: r } : r);
const pad = (s: string, n: number) => (s.toUpperCase() + " ".repeat(n)).slice(0, n);

/** One globally throttled clatter, so a whole board flipping is a rattle, not a roar. */
let lastFlap = 0;
const clatter = () => {
  const now = performance.now();
  if (now - lastFlap < 16) return;
  lastFlap = now;
  sfx.flap();
};

type Cell = {
  root: HTMLElement;
  top: HTMLElement;
  bottom: HTMLElement;
  leafTop: HTMLElement;
  leafBottom: HTMLElement;
  shown: string;
  queue: string[];
  busy: boolean;
  timer: number;
};

/**
 * A mechanical split-flap display. Each cell is a drum of leaves: to change, it turns
 * through the character set from what it shows to what it should show, one leaf at a
 * time, the top half falling over the bottom. Rows start a beat apart and cells a few
 * milliseconds apart, the way a station board ripples. The text is real text for
 * screen readers; the flaps are decoration on top of it.
 */
export function SplitFlapBoard(props: Props) {
  // a board of a different shape is a different board
  return <Board key={`${props.rows.length}x${props.columns}`} {...props} />;
}

function Board({ label, rows, columns, charset = FLAP_CHARS, rowStagger = 70, flipMs = 64, size = "m", live, className }: Props) {
  const board = useRef<HTMLDivElement>(null);
  const cells = useRef<Cell[][]>([]);
  const data = useMemo(() => rows.map(norm).map((r) => ({ ...r, text: pad(r.text, columns) })), [rows, columns]);
  // React draws the first characters; after that the drums own the glyphs, so a
  // re-render never snaps a leaf mid-fall
  const [initial] = useState(data);

  // wire up the cells rendered on the server, once
  useEffect(() => {
    const el = board.current;
    if (!el) return;
    cells.current = Array.from(el.querySelectorAll<HTMLElement>("[data-row]")).map((row) =>
      Array.from(row.querySelectorAll<HTMLElement>("[data-cell]")).map((c) => ({
        root: c,
        top: c.querySelector<HTMLElement>("[data-top]")!,
        bottom: c.querySelector<HTMLElement>("[data-bottom]")!,
        leafTop: c.querySelector<HTMLElement>("[data-leaf-top]")!,
        leafBottom: c.querySelector<HTMLElement>("[data-leaf-bottom]")!,
        shown: c.dataset.char ?? " ",
        queue: [],
        busy: false,
        timer: 0,
      })),
    );
    const all = cells.current;
    return () => all.flat().forEach((c) => window.clearTimeout(c.timer));
  }, []);

  useEffect(() => {
    const grid = cells.current;
    if (!grid.length) return;
    const reduced = prefersReducedMotion();
    data.forEach((row, r) => {
      const line = grid[r];
      if (!line) return;
      line[0]?.root.parentElement?.setAttribute("data-tone", row.tone ?? "");
      [...row.text].forEach((ch, c) => {
        const cell = line[c];
        if (!cell || cell.shown === ch) return;
        if (reduced) {
          set(cell, ch);
          return;
        }
        cell.queue = path(cell.queue.at(-1) ?? cell.shown, ch, charset);
        const delay = r * rowStagger + c * 9 + Math.random() * 30;
        window.clearTimeout(cell.timer);
        cell.timer = window.setTimeout(() => turn(cell, flipMs), delay);
      });
    });
  }, [data, charset, rowStagger, flipMs]);

  return (
    <div ref={board} className={`${styles.board} ${className ?? ""}`} data-size={size} role="list" aria-label={label} aria-live={live ? "polite" : undefined} style={{ "--cols": columns } as CSSProperties}>
      {initial.map((row, r) => (
        <div key={r} className={styles.row} role="listitem" aria-label={data[r]?.text.trim() || "blank"} data-row data-tone={row.tone ?? ""}>
          {[...row.text].map((ch, c) => (
            <span key={c} className={styles.cell} data-cell data-char={ch} aria-hidden>
              <span className={styles.half} data-top>
                <b>{ch}</b>
              </span>
              <span className={`${styles.half} ${styles.low}`} data-bottom>
                <b>{ch}</b>
              </span>
              <span className={`${styles.half} ${styles.leaf}`} data-leaf-top>
                <b>{ch}</b>
              </span>
              <span className={`${styles.half} ${styles.low} ${styles.leaf} ${styles.leafLow}`} data-leaf-bottom>
                <b>{ch}</b>
              </span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** The leaves a drum turns through from one character to the next, in charset order. */
const path = (from: string, to: string, charset: string) => {
  const a = charset.indexOf(from);
  const b = charset.indexOf(to);
  if (a < 0 || b < 0) return [to];
  const steps: string[] = [];
  let i = a;
  while (i !== b && steps.length < 64) {
    i = (i + 1) % charset.length;
    steps.push(charset[i]!);
  }
  return steps.length > MAX_STEPS ? steps.slice(-MAX_STEPS) : steps;
};

const text = (el: HTMLElement, ch: string) => {
  const b = el.firstElementChild as HTMLElement | null;
  if (b && b.textContent !== ch) b.textContent = ch;
};

const set = (cell: Cell, ch: string) => {
  [cell.top, cell.bottom, cell.leafTop, cell.leafBottom].forEach((el) => text(el, ch));
  cell.shown = ch;
  cell.root.dataset.char = ch;
};

/** Fall one leaf: the old top half drops away, revealing the new top; then the new bottom half lands. */
const turn = (cell: Cell, ms: number) => {
  const next = cell.queue.shift();
  if (next === undefined) {
    cell.busy = false;
    return;
  }
  cell.busy = true;
  const from = cell.shown;
  text(cell.top, next);
  text(cell.leafTop, from);
  text(cell.leafBottom, next);
  text(cell.bottom, from);
  cell.leafTop.animate([{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }], { duration: ms / 2, easing: "cubic-bezier(0.5, 0, 1, 0.6)", fill: "forwards" });
  cell.leafBottom.animate([{ transform: "rotateX(90deg)" }, { transform: "rotateX(90deg)", offset: 0.5 }, { transform: "rotateX(0deg)" }], {
    duration: ms,
    easing: "cubic-bezier(0.2, 0.7, 0.3, 1.25)",
    fill: "forwards",
  });
  clatter();
  cell.timer = window.setTimeout(() => {
    text(cell.bottom, next);
    cell.shown = next;
    cell.root.dataset.char = next;
    turn(cell, ms);
  }, ms);
};
