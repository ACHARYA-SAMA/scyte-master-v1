"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import styles from "./Accordion.module.css";

export type AccordionItem = { id: string; title: string; body: ReactNode };

type Props = {
  items: readonly AccordionItem[];
  /** only one open at a time */
  single?: boolean;
  className?: string;
};

const DUR = 420;
const EASE = "cubic-bezier(0.2, 0.84, 0.16, 1)";

/**
 * Questions and answers built on <details>, so every answer opens without JavaScript.
 * With it, the panel's height is measured and animated (one element, no layout jank
 * elsewhere), and the plus turns into a minus.
 */
export function Accordion({ items, single, className }: Props) {
  const root = useRef<HTMLDivElement>(null);

  const animate = (d: HTMLDetailsElement, open: boolean) => {
    const panel = d.querySelector<HTMLElement>("[data-panel]");
    if (!panel || prefersReducedMotion()) {
      d.open = open;
      return;
    }
    if (open) {
      d.open = true;
      const h = panel.scrollHeight;
      panel.animate([{ height: "0px", opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: DUR, easing: EASE });
    } else {
      const h = panel.scrollHeight;
      const a = panel.animate([{ height: `${h}px`, opacity: 1 }, { height: "0px", opacity: 0 }], { duration: DUR * 0.8, easing: EASE });
      a.onfinish = () => {
        d.open = false;
      };
    }
  };

  const onClick = (e: MouseEvent<HTMLElement>) => {
    const d = e.currentTarget.parentElement as HTMLDetailsElement | null;
    if (!d) return;
    e.preventDefault();
    const opening = !d.open;
    sfx.detent();
    if (opening && single) {
      root.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((other) => other !== d && animate(other, false));
    }
    animate(d, opening);
  };

  return (
    <div ref={root} className={`${styles.accordion} ${className ?? ""}`}>
      {items.map((it) => (
        <details key={it.id} className={styles.item} id={it.id}>
          <summary className={styles.summary} onClick={onClick} data-cursor="open">
            <span className={styles.title}>{it.title}</span>
            <span className={styles.icon} aria-hidden>
              <i />
              <i />
            </span>
          </summary>
          <div className={styles.panel} data-panel>
            <div className={styles.body}>{it.body}</div>
          </div>
        </details>
      ))}
    </div>
  );
}
