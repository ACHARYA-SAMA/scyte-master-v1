"use client";

import { useRef, type KeyboardEvent } from "react";
import styles from "./ScrollRail.module.css";

export type RailItem = { id: string; label: string; detail?: string };
export type RailGroup = { title: string; items: readonly RailItem[] };

type Props = {
  label: string;
  groups: readonly RailGroup[];
  /** the item the scroll is in, counted across groups */
  active: number;
  /** jump to an item; the section scrolls there */
  onSelect: (i: number) => void;
  className?: string;
};

/**
 * The side rail of a scroll-through section: every stage in order, grouped, the
 * current one lit with a bar that fills as you scroll through it. The fill reads the
 * section's `--local` variable, so scrolling never re-renders the rail. Clicking an
 * item, or arrows and Enter, scrolls to that stage.
 */
export function ScrollRail({ label, groups, active, onSelect, className }: Props) {
  const nav = useRef<HTMLElement>(null);
  // each group's first index in the run across groups
  const starts = groups.map((_, g) => groups.slice(0, g).reduce((a, x) => a + x.items.length, 0));

  const onKey = (e: KeyboardEvent) => {
    const all = Array.from(nav.current?.querySelectorAll<HTMLButtonElement>("button[data-i]") ?? []);
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step || at < 0) return;
    e.preventDefault();
    all[(at + step + all.length) % all.length]?.focus();
  };

  return (
    <nav ref={nav} className={`${styles.rail} ${className ?? ""}`} aria-label={label} onKeyDown={onKey}>
      {groups.map((g, gi) => (
        <div key={g.title} className={styles.group}>
          <p className={`${styles.groupTitle} t-hud`}>{g.title}</p>
          <ol className={styles.items}>
            {g.items.map((it, k) => {
              const i = starts[gi]! + k;
              const on = i === active;
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    className={styles.item}
                    data-i={i}
                    data-on={on ? "1" : undefined}
                    data-past={i < active ? "1" : undefined}
                    aria-current={on ? "step" : undefined}
                    onClick={() => onSelect(i)}
                    data-cursor="open"
                  >
                    <span className={styles.name}>{it.label}</span>
                    {it.detail ? <span className={`${styles.detail} t-hud`}>{it.detail}</span> : null}
                    <span className={styles.bar} aria-hidden>
                      <span />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </nav>
  );
}
