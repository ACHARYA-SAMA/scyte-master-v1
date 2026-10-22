"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { TransitionLink } from "@/components/transition/navigation";
import { useStore, ui } from "@/lib/store";
import { setSound } from "@/lib/sound";
import { emit } from "@/lib/telemetry";
import { Menu } from "./Menu";
import styles from "./Nav.module.css";

const istClock = () =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());

const subscribeSecond = (onTick: () => void) => {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
};

function Clock() {
  const time = useSyncExternalStore(subscribeSecond, istClock, () => "--:--:--");
  return (
    <span className={styles.readout}>
      <span className={styles.key}>Hyderabad</span> <time className="t-num">{time}</time>
    </span>
  );
}

function ScrollReadout() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
      if (ref.current) ref.current.textContent = String(Math.min(100, Math.max(0, p))).padStart(3, "0");
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
    <span className={styles.readout} aria-hidden>
      <span className={styles.key}>Scrolled</span> <span className="t-num" ref={ref}>000</span>%
    </span>
  );
}

function SoundToggle() {
  const on = useStore(ui, (s) => s.soundOn);
  return (
    <button
      type="button"
      className={styles.sound}
      aria-pressed={on}
      title={on ? "Turn interface sound off" : "Turn interface sound on"}
      onClick={() => setSound(!on)}
      data-on={on ? "1" : "0"}
    >
      <span className={styles.bars} aria-hidden>
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className={styles.soundLabel}>
        Sound<span aria-hidden> {on ? "on" : "off"}</span>
      </span>
    </button>
  );
}

export function Nav() {
  const menuOpen = useStore(ui, (s) => s.menuOpen);
  const pathname = usePathname();

  return (
    <>
      <header className={styles.nav} data-menu={menuOpen ? "1" : "0"}>
        <TransitionLink href="/" className={styles.home} aria-label="Scyte, home" data-nav-logo>
          <Logo className={styles.logo} title={null} />
        </TransitionLink>

        <div className={styles.instruments}>
          <Clock />
          <ScrollReadout />
        </div>

        <div className={styles.actions}>
          <SoundToggle />
          {pathname !== "/contact" ? (
            <TransitionLink href="/contact#audit" className={styles.cta} data-magnetic="0.2">
              Book a store audit
            </TransitionLink>
          ) : null}
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => {
              ui.set({ menuOpen: !menuOpen });
              if (!menuOpen) emit("menu_open");
            }}
            data-magnetic="0.25"
          >
            <span className={styles.menuIcon} aria-hidden>
              <i />
              <i />
            </span>
            <span>{menuOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
      </header>
      <Menu />
    </>
  );
}
