"use client";

import { forwardRef, type KeyboardEvent } from "react";
import { displayName, type Member } from "@/data/team";
import { Portrait } from "./Portrait";
import styles from "./Team.module.css";

type Props = {
  team: Member[];
  active: number;
  onPreview: (i: number) => void;
  onOpen: (i: number) => void;
  onLeave: () => void;
  touch: boolean;
};

/**
 * The dock. Hover or focus previews a member; the hovered thumb lifts out and its
 * neighbours part. Arrow keys move between members, Enter opens the dossier.
 */
export const Thumbs = forwardRef<HTMLDivElement, Props>(function Thumbs(
  { team, active, onPreview, onOpen, onLeave, touch },
  ref,
) {
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : null;
    if (next !== null) {
      e.preventDefault();
      const j = (next + team.length) % team.length;
      (e.currentTarget.parentElement?.children[j] as HTMLElement | undefined)?.focus();
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const j = e.key === "Home" ? 0 : team.length - 1;
      (e.currentTarget.parentElement?.children[j] as HTMLElement | undefined)?.focus();
    }
  };

  return (
    <div
      ref={ref}
      className={styles.dock}
      role="toolbar"
      aria-label="Team members"
      aria-orientation="horizontal"
      onPointerLeave={touch ? undefined : onLeave}
      style={{ "--n": team.length } as React.CSSProperties}
    >
      {team.map((m, i) => {
        const d = active < 0 ? 99 : Math.abs(i - active);
        return (
          <button
            key={m.slug}
            type="button"
            className={styles.thumb}
            data-dist={d > 2 ? "far" : String(d)}
            data-side={active < 0 || i === active ? undefined : i < active ? "left" : "right"}
            aria-pressed={i === active}
            aria-label={`${displayName(m)}, ${m.role}. Open dossier.`}
            tabIndex={i === Math.max(0, active) ? 0 : -1}
            data-cursor="lock"
            onPointerEnter={touch ? undefined : () => onPreview(i)}
            onFocus={touch ? undefined : () => onPreview(i)}
            onClick={() => (touch && active !== i ? onPreview(i) : onOpen(i))}
            onKeyDown={(e) => onKey(e, i)}
          >
            <Portrait member={m} className={styles.thumbImg} alt="" />
            <span className={styles.thumbTag} aria-hidden>
              {m.roleShort}
            </span>
          </button>
        );
      })}
    </div>
  );
});
