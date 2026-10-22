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
  "aria-label"?: string;
};

/**
 * The DOM half of a 3D scene. While this section is on screen the persistent canvas
 * shows `scene`, and the section's scroll progress (top of section at the top of the
 * viewport to bottom at the bottom) is published for the scene to read. The scene's
 * code is fetched when the section comes within a viewport and a half.
 */
export function SceneSection({ scene, id, className, style, children, onProgress, ...rest }: Props) {
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

    const vis = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        if (e.isIntersecting) gl.set({ scene, visible: true, progress: st.progress });
        else if (gl.get().scene === scene) gl.set({ visible: false });
      },
      { threshold: 0 },
    );
    vis.observe(el);

    return () => {
      near.disconnect();
      vis.disconnect();
      st.kill();
      if (gl.get().scene === scene) gl.set({ scene: "none", visible: false, progress: 0 });
    };
  }, [scene]);

  return (
    <section ref={ref} id={id} className={className} style={style} data-scene={scene} {...rest}>
      {children}
    </section>
  );
}
