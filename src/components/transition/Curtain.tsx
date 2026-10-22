"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { Logo } from "@/components/brand/Logo";
import { registerCurtain } from "./curtainControl";
import styles from "./Curtain.module.css";

type Grid = { cols: number; rows: number; size: number };

const measure = (): Grid => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cols = Math.max(6, Math.min(18, Math.round(w / 96)));
  const size = Math.ceil(w / cols);
  return { cols, rows: Math.ceil(h / size), size };
};

/**
 * The route curtain: the screen pixelates into event-pixel cells radiating from the
 * click, names the destination, then dissolves top to bottom onto the new page.
 */
export function Curtain() {
  const root = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [grid, setGrid] = useState<Grid | null>(null);

  useEffect(() => {
    const update = () => setGrid(measure());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || !grid) return;
    const reduced = prefersReducedMotion();
    const cells = () => Array.from(el.querySelectorAll<HTMLElement>("[data-cell]"));
    const mark = el.querySelector<HTMLElement>("[data-mark]");

    registerCurtain({
      cover: ({ x, y }, label) =>
        new Promise<void>((resolve) => {
          if (labelRef.current) labelRef.current.textContent = label;
          el.dataset.active = "1";
          sfx.slice();
          if (reduced) {
            gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2, onComplete: resolve });
            gsap.set(cells(), { scale: 1 });
            gsap.set(mark, { opacity: 1 });
            return;
          }
          gsap.set(el, { opacity: 1 });
          const col = Math.min(grid.cols - 1, Math.floor(x / grid.size));
          const row = Math.min(grid.rows - 1, Math.floor(y / grid.size));
          const tl = gsap.timeline({ onComplete: resolve });
          tl.fromTo(
            cells(),
            { scale: 0 },
            {
              scale: 1.02,
              duration: 0.34,
              ease: "latch",
              stagger: { grid: [grid.rows, grid.cols], from: row * grid.cols + col, amount: 0.38 },
            },
          );
          tl.fromTo(mark, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, ease: "glide" }, "-=0.18");
        }),
      reveal: () =>
        new Promise<void>((resolve) => {
          const done = () => {
            el.dataset.active = "0";
            resolve();
          };
          if (reduced) {
            gsap.to(el, { opacity: 0, duration: 0.25, onComplete: done });
            return;
          }
          const tl = gsap.timeline({ onComplete: done });
          tl.to(mark, { opacity: 0, y: -8, duration: 0.2, ease: "cut" });
          tl.to(
            cells(),
            {
              scale: 0,
              duration: 0.32,
              ease: "cut",
              stagger: { grid: [grid.rows, grid.cols], from: "start", axis: "y", amount: 0.36 },
            },
            "-=0.05",
          );
        }),
    });
    return () => registerCurtain(null);
  }, [grid]);

  return (
    <div ref={root} className={styles.curtain} data-active="0" aria-hidden>
      {grid ? (
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `repeat(${grid.cols}, ${grid.size}px)`, gridAutoRows: `${grid.size}px` }}
        >
          {Array.from({ length: grid.cols * grid.rows }, (_, i) => (
            <span key={i} data-cell className={styles.cell} />
          ))}
        </div>
      ) : null}
      <div className={styles.mark} data-mark>
        <Logo className={styles.logo} title={null} />
        <span className="t-mono" ref={labelRef} />
      </div>
    </div>
  );
}
