"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { gsap, prefersReducedMotion, springStep, SPRING } from "@/lib/motion";
import { Battery, Signal } from "./icons";
import styles from "./InteractivePhone.module.css";

const istTime = () =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
const subscribe = (cb: () => void) => {
  const id = window.setInterval(cb, 10000);
  return () => window.clearInterval(id);
};

/**
 * The same generic phone as InteractivePhone, for screens that are not a chat: an app
 * prototype, a social feed. Tilts on springs; children are the live screen.
 */
export function PhoneFrame({ children, label, className, tilt = true }: { children: ReactNode; label: string; className?: string; tilt?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const device = useRef<HTMLDivElement>(null);
  const time = useSyncExternalStore(subscribe, istTime, () => "--:--");

  useEffect(() => {
    const el = device.current;
    const w = wrap.current;
    if (!el || !w || !tilt || prefersReducedMotion()) return;
    const s = { rx: 0, vx: 0, ry: 0, vy: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      const r = w.getBoundingClientRect();
      if (e.clientY < r.top - 240 || e.clientY > r.bottom + 240) return;
      s.ty = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2))) * 8;
      s.tx = -Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2))) * 6;
    };
    const onLeave = () => {
      s.tx = 0;
      s.ty = 0;
    };
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      [s.rx, s.vx] = springStep(s.rx, s.vx, s.tx, SPRING.float, dt);
      [s.ry, s.vy] = springStep(s.ry, s.vy, s.ty, SPRING.float, dt);
      el.style.setProperty("--rx", `${s.rx.toFixed(2)}deg`);
      el.style.setProperty("--ry", `${s.ry.toFixed(2)}deg`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    w.addEventListener("pointerleave", onLeave);
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      w.removeEventListener("pointerleave", onLeave);
      gsap.ticker.remove(tick);
    };
  }, [tilt]);

  return (
    <div ref={wrap} className={`${styles.wrap} ${className ?? ""}`} data-variant="device" role="region" aria-label={label}>
      <div ref={device} className={styles.device}>
        <span className={styles.edge} aria-hidden />
        <span className={styles.edge} aria-hidden />
        <span className={styles.edge} aria-hidden />
        <span className={styles.buttons} aria-hidden />
        <div className={styles.bezel}>
          <div className={styles.screen} data-screen data-lenis-prevent data-cursor="default" style={{ gridTemplateRows: "auto 1fr" }}>
            <div className={styles.statusbar} aria-hidden>
              <time suppressHydrationWarning>{time}</time>
              <span className={styles.island} />
              <span className={styles.sys}>
                <Signal className={styles.sysIcon} />
                <Battery className={styles.battery} />
              </span>
            </div>
            <div style={{ position: "relative", minHeight: 0, overflow: "hidden" }}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
