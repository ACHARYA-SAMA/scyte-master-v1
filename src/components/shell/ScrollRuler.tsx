"use client";

import { useEffect, useRef } from "react";
import styles from "./ScrollRuler.module.css";

const TICKS = 41;

/**
 * Scroll position as an instrument ruler on the right edge: forty ticks, a cell that
 * rides the current position, and every tenth tick taller.
 */
export function ScrollRuler() {
  const marker = useRef<HTMLSpanElement>(null);
  const ticks = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let lastLit = -1;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (marker.current) marker.current.style.transform = `translateY(${p * 100}cqh)`;
      const lit = Math.round(p * (TICKS - 1));
      if (lit !== lastLit && ticks.current) {
        ticks.current.children[lastLit]?.removeAttribute("data-lit");
        ticks.current.children[lit]?.setAttribute("data-lit", "1");
        lastLit = lit;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={styles.ruler} aria-hidden>
      <div className={styles.ticks} ref={ticks}>
        {Array.from({ length: TICKS }, (_, i) => (
          <i key={i} data-major={i % 10 === 0 ? "1" : undefined} />
        ))}
      </div>
      <span className={styles.marker} ref={marker} />
    </div>
  );
}
