"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { readAnchor } from "@/components/gl/anchors";
import { gl, ui, type SceneKey } from "@/lib/store";
import styles from "./AnchorDock.module.css";

type Props = {
  /** the anchor the dock's top-left (or centre, with `center`) sits on */
  at: string;
  /** a second anchor: the dock stretches from `at` to this one's x */
  to?: string;
  scene: SceneKey;
  center?: boolean;
  className?: string;
  children: ReactNode;
  label?: string;
};

/**
 * DOM controls docked to a point in the 3D scene, so a knob can sit on the valve it
 * turns rather than in a panel beside it. Positions are read from the scene's
 * projected anchors once per frame. Without WebGL the dock falls back into the normal
 * flow, so the control is still there.
 */
export function AnchorDock({ at, to, scene, center, className, children, label }: Props) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const node = el.current;
      if (!node) return;
      const g = gl.get();
      const webgl = ui.get().webgl;
      const a = readAnchor(at);
      const b = to ? readAnchor(to) : undefined;
      const on = webgl === "ready" && g.scene === scene && g.visible && !!a?.onScreen;
      // without a scene to sit in, the dock joins the flow; between scenes it hides
      const flag = on ? "1" : webgl === "ready" || webgl === "pending" ? "off" : "0";
      if (node.dataset.live !== flag) node.dataset.live = flag;
      if (!on || !a) return;
      const t = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)${center ? " translate(-50%, -50%)" : ""}`;
      if (node.style.transform !== t) node.style.transform = t;
      if (b) {
        const w = `${Math.max(0, b.x - a.x).toFixed(1)}px`;
        if (node.style.width !== w) node.style.width = w;
      }
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [at, to, scene, center]);

  return (
    <div ref={el} className={`${styles.dock} ${className ?? ""}`} data-live="off" role="group" aria-label={label}>
      {children}
    </div>
  );
}
