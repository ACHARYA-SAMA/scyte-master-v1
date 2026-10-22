"use client";
// v1 compatibility: pages not yet rebuilt still declare a scene; it is ignored.

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { stage } from "@/lib/store";

/** Every page declares which formation the persistent field takes. */
export function StageScene({ scene }: { scene: string }) {
  useEffect(() => {
    stage.set({ scene });
  }, [scene]);
  return null;
}

let openWindows = 0;
const refresh = () => stage.set({ visible: openWindows > 0 });

/**
 * A transparent region through which the WebGL stage is seen. The stage only renders
 * while at least one window is on screen.
 */
export function StageWindow({
  children,
  className,
  style,
  as: Tag = "section",
  ...rest
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: "section" | "div" | "header";
} & Partial<Record<`data-${string}` | `aria-${string}` | "id", string>>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inView = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting === inView) return;
        inView = entry.isIntersecting;
        openWindows += inView ? 1 : -1;
        refresh();
      },
      { rootMargin: "10% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (inView) {
        openWindows -= 1;
        refresh();
      }
    };
  }, []);
  return (
    <Tag ref={ref as never} className={className} style={style} {...rest}>
      {children}
    </Tag>
  );
}
