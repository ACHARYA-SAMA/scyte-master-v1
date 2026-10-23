"use client";

import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import styles from "./LaptopShell.module.css";

/** The screen's logical size: a standard 16:10 laptop display. */
export const SCREEN_W = 1280;
export const SCREEN_H = 800;
/** On phones and tablets the machine lies flat as a portrait tablet, so its page can reflow. */
const FLAT_W = 820;
const FLAT_H = 1180;
const MENU_H = 26;
/** How long the wheel has to keep pushing past the inner page's end before the page outside takes over, ms. */
const DWELL = 320;
/** How long after the pointer leaves before the outer scroll drives the screen again, ms. */
const RETURN = 700;

export type LaptopHandle = {
  /** outer scroll progress 0..1, which drives the inner page while in auto */
  scrub: (p: number) => void;
  /** the lid: 0 shut, 1 open */
  lid: (v: number) => void;
  /** scroll the inner page to a y, in logical px */
  scrollTo: (y: number) => void;
};

export type DockItem = { id: string; label: string; glyph: ReactNode; on?: boolean; onClick?: () => void };

type Props = {
  label: string;
  /** the app in the menu bar */
  app: string;
  menu?: readonly string[];
  /** the page inside, laid out at SCREEN_W logical px */
  children: ReactNode;
  /** windows and panels over the page that do not scroll with it */
  overlay?: ReactNode;
  dock?: readonly DockItem[];
  /** the inner page scrolled, in logical px */
  onInnerScroll?: (y: number, max: number) => void;
  className?: string;
  ref?: Ref<LaptopHandle>;
};

const ist = () =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date())
    .replace(/,/g, "");
const tickEvery = (cb: () => void) => {
  const id = window.setInterval(cb, 15000);
  return () => window.clearInterval(id);
};

/** A plain US layout: [code, width units]. The deck is seen at a steep angle, so caps carry no legends. */
const ROWS: [string, number][][] = [
  [["Escape", 1.4], ...Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, 1] as [string, number]), ["Power", 1]],
  [["Backquote", 1], ..."1234567890".split("").map((d) => [`Digit${d}`, 1] as [string, number]), ["Minus", 1], ["Equal", 1], ["Backspace", 1.6]],
  [["Tab", 1.6], ..."QWERTYUIOP".split("").map((c) => [`Key${c}`, 1] as [string, number]), ["BracketLeft", 1], ["BracketRight", 1], ["Backslash", 1]],
  [["CapsLock", 1.9], ..."ASDFGHJKL".split("").map((c) => [`Key${c}`, 1] as [string, number]), ["Semicolon", 1], ["Quote", 1], ["Enter", 1.7]],
  [["ShiftLeft", 2.4], ..."ZXCVBNM".split("").map((c) => [`Key${c}`, 1] as [string, number]), ["Comma", 1], ["Period", 1], ["Slash", 1], ["ShiftRight", 2.2]],
  [["Fn", 1], ["ControlLeft", 1], ["AltLeft", 1], ["MetaLeft", 1.3], ["Space", 5.2], ["MetaRight", 1.3], ["AltRight", 1], ["ArrowLeft", 1], ["ArrowUp", 1], ["ArrowRight", 1]],
];

function Deck() {
  const deck = useRef<HTMLDivElement>(null);
  // the real keys go down as the visitor types, wherever focus is
  useEffect(() => {
    const el = deck.current;
    if (!el) return;
    const down = (e: KeyboardEvent) => {
      const code = e.code === "ArrowDown" ? "ArrowUp" : e.code;
      const k = el.querySelector<HTMLElement>(`[data-code="${code}"]`);
      if (!k) return;
      k.dataset.down = "1";
      window.setTimeout(() => delete k.dataset.down, 140);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);
  return (
    <div className={styles.deckWrap} aria-hidden>
      <div ref={deck} className={styles.deck}>
        <div className={styles.keys}>
          {ROWS.map((row, r) => (
            <div key={r} className={styles.keyRow} data-fn={r === 0 ? "1" : undefined}>
              {row.map(([code, w]) => (
                <span key={code} className={styles.key} data-code={code} style={{ flexGrow: w }} />
              ))}
            </div>
          ))}
        </div>
        <div className={styles.pad} />
      </div>
      <div className={styles.lip}>
        <span className={styles.notch} />
      </div>
    </div>
  );
}

function MenuBar({ app, menu }: { app: string; menu: readonly string[] }) {
  const time = useSyncExternalStore(tickEvery, ist, () => "");
  return (
    <div className={styles.menubar}>
      <span className={styles.glyph} />
      <strong>{app}</strong>
      {menu.map((m) => (
        <span key={m} className={styles.menuItem}>
          {m}
        </span>
      ))}
      <span className={styles.status}>
        <svg viewBox="0 0 16 12" className={styles.icon}>
          <path d="M8 11.2 1 4.6a10 10 0 0 1 14 0Z" fill="currentColor" opacity="0.9" />
        </svg>
        <svg viewBox="0 0 24 12" className={styles.icon}>
          <rect x="0.5" y="0.5" width="20" height="11" rx="3" fill="none" stroke="currentColor" />
          <rect x="2.5" y="2.5" width="13" height="7" rx="1.5" fill="currentColor" />
          <rect x="21.5" y="4" width="2" height="4" rx="1" fill="currentColor" />
        </svg>
        <span>Hyderabad</span>
        <time>{time}</time>
      </span>
    </div>
  );
}

function Dock({ items, scale }: { items: readonly DockItem[]; scale: number }) {
  const row = useRef<HTMLDivElement>(null);
  // the icons swell under the pointer, the nearest most
  const move = (clientX: number) => {
    const el = row.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>("[data-dock]").forEach((b) => {
      const r = b.getBoundingClientRect();
      const d = Math.abs(clientX - (r.left + r.width / 2)) / scale;
      b.style.setProperty("--m", (1 + 0.55 * Math.max(0, 1 - d / 130)).toFixed(3));
    });
  };
  const leave = () => row.current?.querySelectorAll<HTMLElement>("[data-dock]").forEach((b) => b.style.setProperty("--m", "1"));
  return (
    <div ref={row} className={styles.dock} onPointerMove={(e) => move(e.clientX)} onPointerLeave={leave}>
      {items.map((it) => (
        <button key={it.id} type="button" className={styles.dockItem} data-dock data-on={it.on ? "1" : undefined} onClick={it.onClick} aria-label={it.label} data-cursor="open">
          {it.glyph}
          <span className={styles.dockTip}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * A laptop with a standard 16:10 screen and a real page inside it. While the section
 * around it is pinned, the outer scroll scrolls the inner page (auto); point at the
 * screen and the wheel scrolls it by hand (manual), handing back to the page outside
 * after a short push past either end, so nobody is ever trapped. The lid opens with
 * the scroll, the glass catches the pointer, and the keys go down as you type. At
 * rest the screen carries no 3D transform at all, so its text stays sharp.
 */
export function LaptopShell({ label, app, menu = ["File", "Edit", "View", "Window", "Help"], children, overlay, dock, onInnerScroll, className, ref }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const lidEl = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(0.6);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [touch, setTouch] = useState(false);
  const [cue, setCue] = useState(false);
  const st = useRef({ mode: "auto" as "auto" | "manual", p: 0, set: -1, edgeSince: 0, released: false, back: 0 as number, cueShown: false });
  const onScrollCb = useRef(onInnerScroll);
  useEffect(() => {
    onScrollCb.current = onInnerScroll;
  });

  // fit the laptop to its box: as wide as it can be, the screen no taller than 70 % of the view
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight || window.innerHeight * 0.8;
      const flat = window.matchMedia("(max-width: 960px), (pointer: coarse)").matches;
      const sw = flat ? FLAT_W : SCREEN_W;
      const sh = flat ? FLAT_H : SCREEN_H;
      // width: screen plus bezels plus the deck's overhang; height: screen, bezel, deck, indicator
      const byW = w / (sw * (flat ? 1.05 : 1.12));
      const byH = flat ? Infinity : (h - 40) / (sh * 1.06 + sw * 0.15);
      const byView = flat ? (window.innerHeight * 0.78) / sh : (window.innerHeight * 0.7) / sh;
      setScale(Math.max(0.18, Math.min(byW, byH, byView)));
      setTouch(flat);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = () => {
    const s = scroller.current;
    return s ? Math.max(0, s.scrollHeight - s.clientHeight) : 0;
  };
  const setTop = (y: number) => {
    const s = scroller.current;
    if (!s) return;
    st.current.set = Math.round(y);
    s.scrollTop = y;
  };

  useImperativeHandle(
    ref,
    () => ({
      scrub: (p) => {
        st.current.p = p;
        if (st.current.mode === "auto" && !st.current.back) setTop(p * max());
      },
      lid: (v) => {
        const el = lidEl.current;
        if (!el) return;
        // fully open means no transform at all: a 3D-transformed layer would soften the text
        if (v >= 0.999 || prefersReducedMotion()) el.style.transform = "";
        else el.style.transform = `rotateX(${(-(1 - v) * 92).toFixed(2)}deg)`;
        el.dataset.shut = v < 0.04 ? "1" : "0";
      },
      scrollTo: (y) => {
        const s = scroller.current;
        if (!s) return;
        st.current.mode = "manual";
        setMode("manual");
        gsap.to(s, { scrollTop: y, duration: prefersReducedMotion() ? 0 : 0.7, ease: "glide", overwrite: true });
      },
    }),
    [],
  );

  // the inner page's own scroll: progress bar, scroll-spy, and telling hand from page
  useEffect(() => {
    const s = scroller.current;
    if (!s) return;
    const onScroll = () => {
      const m = max();
      if (bar.current) bar.current.style.transform = `scaleX(${m ? (s.scrollTop / m).toFixed(4) : 0})`;
      onScrollCb.current?.(s.scrollTop, m);
    };
    s.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => s.removeEventListener("scroll", onScroll);
  }, []);

  // the wheel over the screen scrolls the screen; pushing on past an end hands back
  useEffect(() => {
    const s = scroller.current;
    const w = wrap.current;
    if (!s || !w || touch) return;
    const c = st.current;
    const hold = () => {
      if (!c.released) return;
      c.released = false;
      s.setAttribute("data-lenis-prevent", "");
    };
    const release = () => {
      if (c.released) return;
      c.released = true;
      s.removeAttribute("data-lenis-prevent");
    };
    const onWheel = (e: WheelEvent) => {
      if (c.back) {
        gsap.killTweensOf(s);
        c.back = 0;
      }
      if (c.mode !== "manual") {
        c.mode = "manual";
        setMode("manual");
        sfx.blip();
      }
      const m = max();
      const atTop = s.scrollTop <= 0.5;
      const atEnd = s.scrollTop >= m - 0.5;
      const out = (e.deltaY < 0 && atTop) || (e.deltaY > 0 && atEnd);
      const now = performance.now();
      if (!out) {
        c.edgeSince = 0;
        hold();
        return;
      }
      if (!c.edgeSince) c.edgeSince = now;
      if (now - c.edgeSince > DWELL) release();
    };
    let timer = 0;
    const enter = () => {
      window.clearTimeout(timer);
      if (!c.cueShown) {
        c.cueShown = true;
        setCue(true);
        window.setTimeout(() => setCue(false), 2600);
      }
    };
    const leave = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (c.mode === "auto") return;
        // glide back to where the outer scroll says the page should be, then follow it
        hold();
        c.edgeSince = 0;
        c.back = 1;
        gsap.to(s, {
          scrollTop: c.p * max(),
          duration: prefersReducedMotion() ? 0 : 0.55,
          ease: "glide",
          overwrite: true,
          onComplete: () => {
            c.back = 0;
            c.mode = "auto";
            setMode("auto");
          },
        });
      }, RETURN);
    };
    s.addEventListener("wheel", onWheel, { passive: true });
    w.addEventListener("pointerenter", enter);
    w.addEventListener("pointerleave", leave);
    return () => {
      s.removeEventListener("wheel", onWheel);
      w.removeEventListener("pointerenter", enter);
      w.removeEventListener("pointerleave", leave);
      window.clearTimeout(timer);
    };
  }, [touch]);

  // the glass catches the pointer
  useEffect(() => {
    const g = glass.current;
    const w = wrap.current;
    if (!g || !w || prefersReducedMotion()) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = g.getBoundingClientRect();
        g.style.setProperty("--gx", `${(((x - r.left) / r.width) * 100).toFixed(1)}%`);
        g.style.setProperty("--gy", `${(((y - r.top) / r.height) * 100).toFixed(1)}%`);
      });
    };
    w.addEventListener("pointermove", move, { passive: true });
    return () => {
      w.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={wrap}
      className={`${styles.wrap} ${className ?? ""}`}
      data-flat={touch ? "1" : undefined}
      style={{ "--s": scale, "--sw": `${(touch ? FLAT_W : SCREEN_W) * scale}px`, "--sh": `${(touch ? FLAT_H : SCREEN_H) * scale}px`, "--vw": `${touch ? FLAT_W : SCREEN_W}px`, "--vh": `${touch ? FLAT_H : SCREEN_H}px` } as React.CSSProperties}
      role="group"
      aria-label={label}
      data-motion-own
      data-avoid
      data-cursor={touch ? undefined : "scrub"}
    >
      <div className={styles.machine}>
        <div ref={lidEl} className={styles.lid} data-shut="0">
          <span className={styles.camera} aria-hidden />
          <div className={styles.screen}>
            <div className={styles.viewport}>
              <MenuBar app={app} menu={menu} />
              <div
                ref={scroller}
                className={styles.scroller}
                data-lenis-prevent={touch ? undefined : ""}
                tabIndex={0}
                aria-label={`${label}, scrollable`}
                style={{ top: MENU_H }}
              >
                {children}
              </div>
              {overlay}
              {dock?.length ? <Dock items={dock} scale={scale} /> : null}
            </div>
            <div ref={glass} className={styles.glass} aria-hidden />
          </div>
        </div>
        {touch ? null : <Deck />}
      </div>
      <p className={`${styles.meter} t-hud`} aria-live="polite">
        <span className={styles.mode} data-mode={mode}>
          {mode === "auto" ? "Auto" : "Manual"}
        </span>
        <span className={styles.modeText}>{touch ? "The page scrolls the screen" : mode === "auto" ? "The page scrolls the screen" : "You are scrolling inside"}</span>
        <span className={styles.track}>
          <span ref={bar} className={styles.fill} />
        </span>
      </p>
      {cue ? (
        <p className={`${styles.cue} t-hud`} aria-hidden>
          Scroll inside the screen
        </p>
      ) : null}
    </div>
  );
}
