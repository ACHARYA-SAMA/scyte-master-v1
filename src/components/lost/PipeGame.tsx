"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import { toast } from "@/lib/store";
import { TransitionLink } from "@/components/transition/navigation";
import { describe, flow, hint, makeBoard, type Board, type Kind } from "./pipes";
import styles from "./PipeGame.module.css";

const FIRST_SEED = 404;
const BEST_KEY = "scyte.pipe.best";

/** Each pipe drawn at zero turns; the tile rotates the whole drawing. */
const SHAPE: Record<Kind, string> = {
  straight: "M50 0 V100",
  elbow: "M50 0 Q50 50 100 50",
  tee: "M50 0 V100 M50 50 H100",
};

/** The inlet and outlet: a short length of pipe outside the grid. */
function Stub({ wet }: { wet: boolean }) {
  return (
    <svg className={styles.stub} viewBox="0 0 100 100" preserveAspectRatio="none" data-wet={wet ? "1" : undefined}>
      <path className={styles.wall} d="M0 50 H100" />
      <path className={styles.bore} d="M0 50 H100" />
      <path className={styles.liquid} d="M0 50 H100" />
    </svg>
  );
}

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

const summary = (moves: number, hints: number) => {
  if (!moves) return `Fixed with ${plural(hints, "hint")}.`;
  if (!hints) return `Fixed in ${plural(moves, "turn")}. That is the job.`;
  return `Fixed in ${plural(moves, "turn")} and ${plural(hints, "hint")}.`;
};

const readBest = () => {
  try {
    const v = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
};

/**
 * The 404 as a leak to fix: turn the pipes until the liquid reaches home. Tiles are
 * buttons; arrow keys move between them and Enter or Space turns one. The way home
 * never depends on finishing it.
 */
export function PipeGame({ onSolved }: { onSolved?: () => void }) {
  const [seed, setSeed] = useState(FIRST_SEED);
  const [board, setBoard] = useState<Board>(() => makeBoard(FIRST_SEED));
  const [moves, setMoves] = useState(0);
  const [hints, setHints] = useState(0);
  const [focus, setFocus] = useState(board.row * board.cols);
  const [best, setBest] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const home = useRef<HTMLAnchorElement>(null);
  const { depth, solved } = useMemo(() => flow(board), [board]);
  const reached = useRef(depth.size);
  const solvedOnce = useRef(false);

  // localStorage is only there in the browser
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setBest(readBest()), []);

  useEffect(() => {
    if (depth.size > reached.current) sfx.drip();
    reached.current = depth.size;
    if (!solved || solvedOnce.current) return;
    solvedOnce.current = true;
    sfx.pour();
    window.setTimeout(() => sfx.ok(), 500);
    haptic([12, 40, 18]);
    toast(summary(moves, hints), "ok");
    const prev = readBest();
    // a hinted pipe is not a record
    if (!hints && (!prev || moves < prev)) {
      try {
        localStorage.setItem(BEST_KEY, String(moves));
      } catch {
        /* best score just won't be kept */
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a record only exists once the pipe is solved
      setBest(moves);
    }
    window.setTimeout(() => home.current?.focus({ preventScroll: true }), 700);
    onSolved?.();
  }, [depth, solved, moves, hints, onSolved]);

  const turn = (i: number) => {
    if (solved) return;
    sfx.tick();
    setMoves((m) => m + 1);
    setBoard((b) => ({ ...b, tiles: b.tiles.map((t, j) => (j === i ? { ...t, turns: t.turns + 1 } : t)) }));
  };

  const showOne = () => {
    if (solved) return;
    const h = hint(board);
    if (!h) return;
    sfx.clamp();
    setHints((n) => n + 1);
    setFocus(h.index);
    setBoard((b) => ({ ...b, tiles: b.tiles.map((t, j) => (j === h.index ? { ...t, turns: h.turns } : t)) }));
  };

  const fresh = () => {
    const next = seed + 1 + Math.floor(Math.random() * 1000);
    setSeed(next);
    setBoard(makeBoard(next));
    setMoves(0);
    setHints(0);
    solvedOnce.current = false;
    reached.current = 0;
    sfx.slice();
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const { cols, rows } = board;
    const x = focus % cols;
    const y = Math.floor(focus / cols);
    const to: Record<string, number> = {
      ArrowRight: y * cols + Math.min(cols - 1, x + 1),
      ArrowLeft: y * cols + Math.max(0, x - 1),
      ArrowDown: Math.min(rows - 1, y + 1) * cols + x,
      ArrowUp: Math.max(0, y - 1) * cols + x,
      Home: y * cols,
      End: y * cols + cols - 1,
    };
    if (!(e.key in to)) return;
    e.preventDefault();
    setFocus(to[e.key]);
    buttons.current[to[e.key]]?.focus();
  };

  const style = { "--cols": board.cols, "--rows": board.rows, "--row": board.row } as CSSProperties;

  return (
    <div className={styles.game} data-solved={solved ? "1" : undefined} style={style}>
      <div className={styles.board}>
        <span className={`${styles.port} ${styles.inlet}`} aria-hidden>
          <span className="t-hud">You</span>
          <Stub wet />
        </span>
        <div className={styles.grid} role="group" aria-label={`Pipe puzzle, ${board.cols} by ${board.rows}. Turn tiles until the left inlet connects to the right outlet.`} onKeyDown={onKey}>
          {board.tiles.map((t, i) => {
            const d = depth.get(i);
            const wet = d !== undefined;
            return (
              <button
                key={i}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                className={styles.tile}
                data-wet={wet ? "1" : undefined}
                tabIndex={i === focus ? 0 : -1}
                onFocus={() => setFocus(i)}
                onClick={() => turn(i)}
                aria-label={`Row ${Math.floor(i / board.cols) + 1}, column ${(i % board.cols) + 1}: ${describe(t)}${wet ? ", full" : ""}`}
                style={{ "--d": wet ? d : 0 } as CSSProperties}
                data-cursor="tap"
                data-cursor-label="Turn"
              >
                <svg viewBox="0 0 100 100" aria-hidden style={{ transform: `rotate(${t.turns * 90}deg)` }}>
                  <path className={styles.wall} d={SHAPE[t.kind]} />
                  <path className={styles.bore} d={SHAPE[t.kind]} />
                  <path className={styles.liquid} d={SHAPE[t.kind]} />
                </svg>
              </button>
            );
          })}
        </div>
        <span className={`${styles.port} ${styles.outlet}`} aria-hidden>
          <span className="t-hud">Home</span>
          <Stub wet={solved} />
        </span>
      </div>

      <div className={styles.readout}>
        <p className="t-fig">
          <span className="t-hud c-muted">Turns</span> {String(moves).padStart(2, "0")}
        </p>
        <p className="t-fig">
          <span className="t-hud c-muted">Best</span> {best ? String(best).padStart(2, "0") : "--"}
        </p>
        <button type="button" className={styles.again} onClick={showOne} disabled={solved} data-cursor="tap">
          Fix one for me
        </button>
        <button type="button" className={styles.again} onClick={fresh} data-cursor="tap">
          New pipe
        </button>
        <p className="sr-only" role="status" aria-live="polite">
          {solved ? "Connected. The way home is open." : ""}
        </p>
      </div>

      {solved ? (
        <TransitionLink ref={home} href="/" className={styles.home} data-magnetic data-cursor="open">
          Fixed. Go home
        </TransitionLink>
      ) : null}
    </div>
  );
}
