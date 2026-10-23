"use client";

import { useEffect, useRef, useState } from "react";
import { STAMPS, stamps, type StampId } from "@/lib/stamps";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./StampDrop.module.css";

/**
 * When a stamp is found it lands on the screen like a rubber stamp on paper: it comes
 * down large and fast, hits, and leaves its ink, then lifts away into the corner where
 * the passport lives.
 */
export function StampDrop() {
  const [id, setId] = useState<StampId | null>(null);
  const el = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      stamps.subscribe(() => {
        const last = stamps.get().last;
        if (last) setId(last);
      }),
    [],
  );

  useEffect(() => {
    const node = el.current;
    if (!id || !node) return;
    stamps.set({ last: null });
    if (prefersReducedMotion()) {
      const t = window.setTimeout(() => setId(null), 2200);
      return () => window.clearTimeout(t);
    }
    const tl = gsap
      .timeline({ onComplete: () => setId(null) })
      .fromTo(node, { scale: 2.4, rotation: -18, opacity: 0, y: -60 }, { scale: 1, rotation: -6, opacity: 1, y: 0, duration: 0.32, ease: "power4.in" })
      .to(node, { scale: 1.04, duration: 0.08, ease: "power1.out" })
      .to(node, { scale: 1, duration: 0.18, ease: "power2.out" })
      .to(node, { x: () => window.innerWidth * 0.42, y: () => window.innerHeight * 0.4, scale: 0.25, opacity: 0, rotation: 8, duration: 0.7, ease: "cut", delay: 1.4 });
    return () => {
      tl.kill();
    };
  }, [id]);

  const stamp = STAMPS.find((s) => s.id === id);
  if (!stamp) return null;
  return (
    <div className={styles.wrap} aria-hidden>
      <div ref={el} className={styles.stamp}>
        <span className={styles.page}>{stamp.page}</span>
        <span className={styles.name}>{stamp.name}</span>
        <span className={styles.page}>Scyte passport</span>
      </div>
    </div>
  );
}
