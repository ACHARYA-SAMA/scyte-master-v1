"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { ScrollTrigger } from "@/lib/motion";
import { gl, type SceneKey } from "@/lib/store";
import { preloadScene } from "./scenes";

type Props = {
  scene: SceneKey;
  id?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /** Scroll progress callback, 0..1 across the section. */
  onProgress?: (p: number) => void;
  /**
   * When the section takes the canvas. "enter" (default): as soon as any of it is on
   * screen. "top": only once its top reaches the top of the viewport, for a section
   * that covers the screen with its own opaque stage while it arrives, so the switch
   * from the scene before it is never seen.
   */
  claim?: "enter" | "top";
  "aria-label"?: string;
};

/** Every mounted section, so one letting go can hand the canvas back to another still on screen. */
const live = new Map<HTMLElement, { scene: SceneKey; on: boolean; progress: () => number }>();

const handBack = (from: HTMLElement) => {
  for (const [el, s] of live) {
    if (el === from || !s.on) continue;
    gl.set({ scene: s.scene, visible: true, progress: s.progress() });
    return true;
  }
  return false;
};

/**
 * The DOM half of a 3D scene. While this section is on screen the persistent canvas
 * shows `scene`, and the section's scroll progress (top of section at the top of the
 * viewport to bottom at the bottom) is published for the scene to read. The scene's
 * code is fetched when the section comes within a viewport and a half.
 */
export function SceneSection({ scene, id, className, style, children, onProgress, claim = "enter", ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);
  const progressCb = useRef(onProgress);
  useEffect(() => {
    progressCb.current = onProgress;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const near = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          preloadScene(scene);
          near.disconnect();
        }
      },
      { rootMargin: "150% 0px" },
    );
    near.observe(el);

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        if (gl.get().scene === scene) gl.set({ progress: self.progress });
        progressCb.current?.(self.progress);
      },
    });

    const entry = { scene, on: false, progress: () => st.progress };
    live.set(el, entry);

    const vis = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        entry.on = e.isIntersecting;
        if (e.isIntersecting) gl.set({ scene, visible: true, progress: st.progress });
        else if (gl.get().scene === scene && !handBack(el)) gl.set({ visible: false });
      },
      // "top" watches a line along the top edge of the viewport instead of all of it
      { threshold: 0, rootMargin: claim === "top" ? "0px 0px -99% 0px" : "0px" },
    );
    vis.observe(el);

    return () => {
      near.disconnect();
      vis.disconnect();
      st.kill();
      live.delete(el);
      if (gl.get().scene === scene) gl.set({ scene: "none", visible: false, progress: 0 });
    };
  }, [scene, claim]);

  return (
    <section ref={ref} id={id} className={className} style={style} data-scene={scene} {...rest}>
      {children}
    </section>
  );
}
