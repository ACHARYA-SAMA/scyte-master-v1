"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { SceneSection } from "@/components/gl/SceneSection";
import { ScrollTrigger } from "@/lib/motion";
import type { SceneKey } from "@/lib/store";
import styles from "./Station.module.css";

type Props = {
  id: string;
  index: string;
  name: string;
  /** the moment in Aarav's 20 minutes this station happens at */
  mark: string;
  moment: string;
  title: string;
  lede: ReactNode;
  /** controls and readouts under the copy */
  children?: ReactNode;
  /** a DOM stage on the right, for stations that are not 3D */
  stage?: ReactNode;
  scene?: SceneKey;
  height?: string;
  /** scroll progress through the station, 0..1 */
  onProgress?: (p: number) => void;
  tone?: "dark" | "band";
};

/**
 * One station of the machine: pinned for its height, copy on the left, the stage on
 * the right (the persistent canvas behind, or a DOM stage), and its place in
 * Aarav's 20 minutes in the corner.
 */
export function Station({ id, index, name, mark, moment, title, lede, children, stage, scene, height = "260svh", onProgress, tone = "dark" }: Props) {
  const plain = useRef<HTMLElement>(null);
  const cb = useRef(onProgress);
  useEffect(() => {
    cb.current = onProgress;
  });

  // DOM-only stations still publish their progress
  useEffect(() => {
    if (scene || !plain.current) return;
    const st = ScrollTrigger.create({
      trigger: plain.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => cb.current?.(self.progress),
    });
    return () => st.kill();
  }, [scene]);

  const inner = (
    <div className={styles.sticky}>
      <header className={styles.head}>
        <span className={styles.index} aria-hidden>
          {index}
        </span>
        <span className={styles.headText}>
          <span className={`${styles.name} t-hud`}>{name}</span>
          <span className={`${styles.mark} t-hud`}>
            <span className={styles.clock}>{mark}</span>
            {moment}
          </span>
        </span>
      </header>
      <div className={styles.copy}>
        <h2 className={`${styles.title} t-h2`}>{title}</h2>
        <div className={`${styles.lede} t-body`}>{lede}</div>
        {children ? <div className={styles.controls}>{children}</div> : null}
      </div>
      {stage ? <div className={styles.stage}>{stage}</div> : null}
    </div>
  );

  const style = { "--station-h": height } as CSSProperties;

  if (scene)
    return (
      <SceneSection scene={scene} id={id} className={styles.station} style={style} onProgress={onProgress} aria-label={`${index} ${name}`}>
        {inner}
      </SceneSection>
    );

  return (
    <section ref={plain} id={id} className={`${styles.station} ${styles.solid}`} data-tone={tone} style={style} aria-label={`${index} ${name}`}>
      {inner}
    </section>
  );
}
