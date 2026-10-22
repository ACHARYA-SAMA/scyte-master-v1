"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { TransitionLink } from "@/components/transition/navigation";
import { rail, ui, useStore } from "@/lib/store";
import { routeFor } from "@/config/site";
import { toggleSound } from "@/lib/prefs";
import { Menu } from "./Menu";
import styles from "./Nav.module.css";

const istClock = () =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

const subscribeMinute = (onTick: () => void) => {
  const id = window.setInterval(onTick, 5000);
  return () => window.clearInterval(id);
};

/** Hyderabad time, refreshed every few seconds. */
export function Clock({ className }: { className?: string }) {
  const time = useSyncExternalStore(subscribeMinute, istClock, () => "--:--");
  return (
    <time className={className} suppressHydrationWarning>
      {time} IST
    </time>
  );
}

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function Nav() {
  const pathname = usePathname();
  const route = routeFor(pathname);
  const menuOpen = useStore(ui, (s) => s.menuOpen);
  const soundOn = useStore(ui, (s) => s.soundOn);
  const chapters = useStore(rail, (s) => s.chapters);
  const active = useStore(rail, (s) => s.active);
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const [mac, setMac] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- platform is only known on the client
    setMac(isMac());
    let lastY = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY;
        if (Math.abs(dy) > 6) {
          setHidden(dy > 0 && y > 240);
          lastY = y;
        }
        setSolid(y > 24);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const chapter = chapters[active];

  return (
    <>
      <header
        className={styles.nav}
        data-hidden={hidden && !menuOpen ? "1" : undefined}
        data-solid={solid && !menuOpen ? "1" : undefined}
        data-menu={menuOpen ? "1" : undefined}
      >
        <TransitionLink href="/" className={styles.home} aria-label="Scyte, home" data-nav-logo data-magnetic>
          <Logo className={styles.logo} title={null} />
        </TransitionLink>

        <p className={`${styles.where} t-hud`} aria-live="off">
          <span className={styles.chapter}>{route?.chapter ?? "Lost"}</span>
          {chapter ? (
            <span className={styles.sub}>
              <span className={styles.sep} aria-hidden />
              {chapter.label}
            </span>
          ) : null}
        </p>

        <div className={styles.actions}>
          <Clock className={`${styles.clock} t-hud`} />
          <button
            type="button"
            className={`${styles.palette} t-hud`}
            onClick={() => ui.set({ paletteOpen: true })}
            aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
            data-magnetic
          >
            <span className={styles.paletteText}>Jump to</span>
            <kbd className={styles.kbd}>{mac ? "⌘" : "Ctrl"} K</kbd>
          </button>
          <button
            type="button"
            className={`${styles.sound} t-hud`}
            aria-pressed={soundOn}
            onClick={toggleSound}
            data-on={soundOn ? "1" : undefined}
            data-magnetic
          >
            <span className={styles.bars} aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className={styles.soundLabel}>Sound</span>
          </button>
          <button
            ref={menuButton}
            type="button"
            className={`${styles.menuButton} t-hud`}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => ui.set({ menuOpen: !menuOpen })}
            data-magnetic
          >
            <span>{menuOpen ? "Close" : "Menu"}</span>
            <span className={styles.menuIcon} aria-hidden>
              <i />
              <i />
            </span>
          </button>
        </div>
      </header>
      <Menu returnFocus={menuButton} />
    </>
  );
}
