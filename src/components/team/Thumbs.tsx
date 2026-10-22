"use client";

import { forwardRef, type KeyboardEvent } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import * as m from "motion/react-m";
import { displayName, type Member } from "@/data/team";
import { SPRING } from "@/lib/motion";
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

/** Lift and part, in px and scale, by distance from the active thumb. */
const pose = (d: number, side: "left" | "right" | undefined, touch: boolean) => {
  if (d === 0) return { y: touch ? -4 : -10, x: 0, scale: touch ? 1.2 : 1.55 };
  const dir = side === "left" ? -1 : 1;
  if (d === 1) return { y: 0, x: dir * (touch ? 4 : 10), scale: touch ? 1.04 : 1.12 };
  if (d === 2) return { y: 0, x: dir * (touch ? 2 : 5), scale: touch ? 1 : 1.04 };
  return { y: 0, x: 0, scale: 1 };
};

/**
 * The dock. Hover or focus previews a member; the hovered thumb lifts out and its
 * neighbours part, on springs, so sweeping across the row keeps its momentum.
 * Arrow keys move between members, Enter opens the dossier.
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
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
    <div
      ref={ref}
      className={styles.dock}
      role="toolbar"
      aria-label="Team members"
      aria-orientation="horizontal"
      onPointerLeave={touch ? undefined : onLeave}
      style={{ "--n": team.length } as React.CSSProperties}
    >
      {team.map((member, i) => {
        const d = active < 0 ? 99 : Math.abs(i - active);
        const side = active < 0 || i === active ? undefined : i < active ? "left" : "right";
        return (
          <m.button
            key={member.slug}
            animate={pose(d, side, touch)}
            transition={SPRING.dock}
            style={{ originY: 1 }}
            type="button"
            className={styles.thumb}
            data-dist={d > 2 ? "far" : String(d)}
            data-side={side}
            aria-pressed={i === active}
            aria-label={`${displayName(member)}, ${member.role}. Open dossier.`}
            tabIndex={i === Math.max(0, active) ? 0 : -1}
            data-cursor="lock"
            onPointerEnter={touch ? undefined : () => onPreview(i)}
            onFocus={touch ? undefined : () => onPreview(i)}
            onClick={() => (touch && active !== i ? onPreview(i) : onOpen(i))}
            onKeyDown={(e) => onKey(e, i)}
          >
            <Portrait member={member} className={styles.thumbImg} alt="" />
            <span className={styles.thumbTag} aria-hidden>
              {member.roleShort}
            </span>
          </m.button>
        );
      })}
    </div>
    </MotionConfig>
    </LazyMotion>
  );
});
