"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SceneSection } from "@/components/gl/SceneSection";
import { readAnchor } from "@/components/gl/anchors";
import { preloadScene } from "@/components/gl/scenes";
import { scrollToY } from "@/components/providers/SmoothScroll";
import { useTransitionRouter } from "@/components/transition/navigation";
import { RotaryKnob } from "@/components/kit/RotaryKnob";
import { CopyEmail } from "@/components/shell/CopyEmail";
import { Clock } from "@/components/nav/Nav";
import { CHARGE_PX, LOCK_MS, SCENE_FOR, SLOTS, TRAVEL_MS, junction, markVisited, slotOf, storyNext } from "@/lib/junction";
import { prefersReducedMotion, ScrollTrigger } from "@/lib/motion";
import { gl, session, ui, useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import { SITE } from "@/config/site";
import { splash } from "./Splash";
import styles from "./Junction.module.css";

/** Extra scroll past a full charge, so a hard flick never hits the page's floor first. */
const SLACK = 700;
/** Horizontal trackpad travel per detent, px. */
const DETENT = 110;
/** After this long without input, a part-filled pipe drains back. */
const DRAIN_MS = 1400;
const HINT_MS = 1500;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * J1, the Junction: the end of every page. A crossroads of six labelled paths in
 * fixed slots; the one for this page is "You are here" and the story's next page is
 * flagged Continue. Steer with the pointer, the arrows, the number keys, a sideways
 * swipe or the compass; scroll to fill the highlighted pipe; at full the camera dives
 * into its portal and the destination's splash takes over. Every sign is a real link,
 * so the Junction is crawlable, tabbable and works without WebGL as six cards.
 */
export function Junction() {
  const pathname = usePathname();
  const router = useRouter();
  const go = useTransitionRouter();
  const here = slotOf(pathname);
  const next = storyNext(pathname);
  const hi = useStore(junction, (s) => s.hi);
  const phase = useStore(junction, (s) => s.phase);
  const drawn = useStore(junction, (s) => s.drawn);
  const webgl = useStore(ui, (s) => s.webgl);
  const scene = useStore(gl, (s) => s.scene);
  const recovered = useStore(session, (s) => s.recovered);
  const [reduced, setReduced] = useState(false);
  const [touch, setTouch] = useState(false);
  const [hint, setHint] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const signs = useRef<(HTMLElement | null)[]>([]);
  const warm = useRef(new Set<string>());
  const st = useRef({ armY: 0, deliberate: false, lockUntil: 0, lastWheel: 0, lastAbs: 0, lastInput: 0, committing: false, tick: 0, accX: 0, touchX: 0, touchStep: 0, prefetchTimer: 0 });

  const live = !reduced && webgl !== "unsupported" && scene === "junction" && drawn && phase !== "away";
  const fallback = reduced || webgl === "unsupported";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the visitor's settings are only known on the client
    setReduced(prefersReducedMotion());
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // a new page: its own slot, its own Continue, nothing charged
  useEffect(() => {
    junction.set({ here, next, hi: next, charge: 0, phase: "away", target: -1 });
    st.current.committing = false;
    markVisited(pathname);
  }, [pathname, here, next]);

  /* -------------------------------------------------------------- prefetch */
  const prefetch = (i: number) => {
    const href = SLOTS[i]?.href;
    if (!href || i === here || warm.current.has(href)) return;
    warm.current.add(href);
    router.prefetch(href);
    const key = SCENE_FOR[href];
    if (key) preloadScene(key);
  };
  const prefetchRef = useRef(prefetch);
  useEffect(() => {
    prefetchRef.current = prefetch;
  });
  // the story's next page is fetched as soon as the browser is idle
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    const id = w.requestIdleCallback ? w.requestIdleCallback(() => prefetchRef.current(next)) : window.setTimeout(() => prefetchRef.current(next), 1500);
    return () => (w.cancelIdleCallback ? w.cancelIdleCallback(id) : window.clearTimeout(id));
  }, [next, pathname]);

  /* -------------------------------------------------------------- steering and commit */
  const setHi = (i: number, quiet = false) => {
    const j = Math.max(0, Math.min(SLOTS.length - 1, i));
    if (junction.get().hi === j) return;
    junction.set({ hi: j });
    if (!quiet) {
      sfx.detent();
      haptic(6);
    }
    window.clearTimeout(st.current.prefetchTimer);
    st.current.prefetchTimer = window.setTimeout(() => prefetchRef.current(j), 150);
  };

  const commit = async (i: number, short = false) => {
    const c = st.current;
    if (c.committing) return;
    const dest = SLOTS[i];
    if (!dest) return;
    if (i === here) {
      // the pad you are standing on: back to the top of this page
      junction.set({ charge: 0 });
      scrollToY(0, 1.6);
      return;
    }
    c.committing = true;
    prefetchRef.current(i);
    const isWarm = warm.current.has(dest.href);
    const dive = !fallback && !short;
    junction.set({ hi: i, phase: "travel", target: i, travelAt: performance.now(), charge: 1 });
    sfx.whoosh();
    haptic([8, 30, 14]);
    await go(dest.href, { x: window.innerWidth / 2, y: window.innerHeight / 2 }, {
      cover: async () => {
        await wait(fallback ? 0 : dive ? TRAVEL_MS * 0.86 : TRAVEL_MS * 0.5);
        await splash.show(i, isWarm);
      },
      reveal: () => splash.reveal(),
    });
    c.committing = false;
  };
  const commitRef = useRef(commit);
  const setHiRef = useRef(setHi);
  useEffect(() => {
    commitRef.current = commit;
    setHiRef.current = setHi;
  });

  /* -------------------------------------------------------------- the charge: native scroll, armed by deliberate input */
  useEffect(() => {
    // SceneSection owns the <section>; the stage is its first child
    const el = stage.current?.parentElement;
    if (!el || fallback) return;
    const c = st.current;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __scyte?: Record<string, unknown> }).__scyte!.junctionInput = c;
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onToggle: (self) => {
        if (self.isActive) {
          // arriving: ignore whatever momentum carried you here
          c.lockUntil = performance.now() + LOCK_MS;
          c.deliberate = false;
          c.armY = self.scroll();
          junction.set({ phase: "arriving", charge: 0 });
          window.setTimeout(() => junction.get().phase === "arriving" && junction.set({ phase: "steering" }), LOCK_MS);
        } else if (self.direction < 0 || self.progress === 0) junction.set({ phase: "away", charge: 0 });
      },
      onUpdate: (self) => {
        const s = junction.get();
        if (s.phase === "away" || s.phase === "travel") return;
        const y = self.scroll();
        const now = performance.now();
        // until the visitor means it, the arm point rides along: momentum fills nothing
        if (now < c.lockUntil || !c.deliberate) c.armY = Math.max(c.armY, y);
        c.armY = Math.max(self.start, c.armY);
        const span = Math.max(240, Math.min(CHARGE_PX, self.end - c.armY - 4));
        const raw = Math.min(1, Math.max(0, (y - c.armY) / span));
        // resistance: the first part of the pull is the heaviest
        const charge = raw ** 1.25;
        junction.set({ charge, phase: charge > 0.01 ? "charging" : "steering" });
        stage.current?.style.setProperty("--charge", charge.toFixed(4));
        const pct = stage.current?.querySelector<HTMLElement>("[data-charge]");
        if (pct) pct.textContent = String(Math.round(charge * 100)).padStart(3, "0");
        const step = Math.floor(charge * 16);
        if (step !== c.tick) {
          if (step > c.tick) sfx.ratchet(charge);
          c.tick = step;
        }
        if (raw >= 0.999 && c.deliberate) void commitRef.current(junction.get().hi);
      },
    });

    const markInput = () => {
      c.lastInput = performance.now();
      setHint(false);
    };
    const onWheel = (e: WheelEvent) => {
      const s = junction.get();
      if (s.phase === "away" || s.phase === "travel") return;
      const now = performance.now();
      markInput();
      // a sideways swipe steers, a detent at a time
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.4) {
        c.accX += e.deltaX;
        while (Math.abs(c.accX) >= DETENT) {
          setHiRef.current(s.hi + Math.sign(c.accX));
          c.accX -= Math.sign(c.accX) * DETENT;
        }
        return;
      }
      const abs = Math.abs(e.deltaY);
      // a new gesture (a pause before it) or an accelerating one is deliberate; a decaying tail is momentum
      if (now >= c.lockUntil && (now - c.lastWheel > 140 || abs > c.lastAbs * 1.15 + 2)) c.deliberate = true;
      c.lastWheel = now;
      c.lastAbs = abs;
    };
    const onKey = (e: KeyboardEvent) => {
      const s = junction.get();
      if (s.phase === "away" || s.phase === "travel") return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      markInput();
      if (["ArrowDown", "PageDown", " ", "End"].includes(e.key) && performance.now() >= c.lockUntil) c.deliberate = true;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        setHiRef.current(s.hi + (e.key === "ArrowLeft" ? -1 : 1));
      } else if (/^[1-6]$/.test(e.key)) setHiRef.current(Number(e.key) - 1);
      else if (e.key === "Enter" && !target?.closest("a, button")) {
        e.preventDefault();
        void commitRef.current(s.hi);
      } else if (e.key === "Escape" && s.charge > 0) {
        c.deliberate = false;
        scrollToY(c.armY, 0.7);
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      const s = junction.get();
      if (s.phase === "away" || s.phase === "travel") return;
      markInput();
      if (performance.now() >= c.lockUntil) c.deliberate = true;
      c.touchX = e.touches[0]?.clientX ?? 0;
      c.touchStep = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      const s = junction.get();
      if (s.phase === "away" || s.phase === "travel") return;
      markInput();
      const dx = (e.touches[0]?.clientX ?? 0) - c.touchX;
      const steps = Math.trunc(dx / -64);
      if (steps !== c.touchStep) {
        setHiRef.current(s.hi + (steps - c.touchStep));
        c.touchStep = steps;
      }
    };
    const onTouchEnd = () => {
      const s = junction.get();
      if (s.phase !== "charging") return;
      // past 70 % a released swipe commits; short of it, the liquid springs back
      if (s.charge > 0.7) void commitRef.current(s.hi);
      else {
        c.deliberate = false;
        scrollToY(c.armY, 0.6);
      }
    };
    const drain = window.setInterval(() => {
      const s = junction.get();
      const idle = performance.now() - c.lastInput;
      if (s.phase === "charging" && idle > DRAIN_MS && s.charge < 0.97 && !c.committing) {
        c.deliberate = false;
        scrollToY(c.armY, 0.9);
      }
      if ((s.phase === "steering" || s.phase === "arriving") && idle > HINT_MS) setHint(true);
    }, 200);

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      trigger.kill();
      window.clearInterval(drain);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [fallback, pathname]);

  /* -------------------------------------------------------------- the pointer steers; signs ride their portals */
  useEffect(() => {
    if (!live) return;
    let raf = 0;
    let px = -1;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      px = e.clientX;
    };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      let best = -1;
      let bestD = Infinity;
      SLOTS.forEach((_, i) => {
        const a = readAnchor(`j-sign-${i}`);
        const el = signs.current[i];
        if (!a || !el) return;
        const t = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
        if (el.style.transform !== t) el.style.transform = t;
        const on = a.onScreen ? "1" : "0";
        if (el.dataset.screen !== on) el.dataset.screen = on;
        if (px >= 0 && i !== here) {
          const d = Math.abs(a.x - px);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      });
      // the nearest pipe takes the highlight, unless one is already filling
      if (best >= 0 && junction.get().charge < 0.08 && junction.get().phase !== "travel") setHiRef.current(best);
      px = -1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [live, here]);

  const onSign = (i: number) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    void commit(i, true);
  };

  const dest = SLOTS[hi]!;
  const height = fallback ? undefined : `calc(100svh + ${CHARGE_PX + SLACK}px)`;

  return (
    <SceneSection
      scene="junction"
      claim="top"
      className={styles.section}
      style={{ height } as CSSProperties}
      aria-label="Junction: where to go next"
      id="junction"
    >
      <div ref={stage} className={styles.stage} data-live={live ? "1" : "0"} data-fallback={fallback ? "1" : undefined} data-touch={touch ? "1" : undefined} data-phase={phase} data-avoid-pill>
        {/* while it arrives the stage is opaque, so the switch from the scene before is never seen */}
        <div className={styles.cover} aria-hidden>
          <p className={styles.coverWord}>Where next?</p>
        </div>

        <header className={styles.head}>
          <p className={`${styles.kicker} t-hud`}>Junction</p>
          <h2 className={styles.title}>Where next?</h2>
          <p className={`${styles.readout} t-small`} aria-live="polite">
            {here === hi ? "You are here. Pick another path." : `${dest.label}, ${dest.chapter}.`}{" "}
            <span className={styles.readoutHow}>{fallback ? "Choose a page." : touch ? "Swipe up to go." : "Scroll, or press Enter, to go."}</span>
          </p>
        </header>

        <ol className={styles.signs} aria-label="Pages">
          {SLOTS.map((s, i) => {
            const isHere = i === here;
            const isNext = i === next;
            return (
              <li key={s.href} className={styles.slot} data-i={i}>
                <a
                  ref={(el) => void (signs.current[i] = el)}
                  href={s.href}
                  className={styles.sign}
                  data-on={i === hi ? "1" : undefined}
                  data-here={isHere ? "1" : undefined}
                  data-next={isNext ? "1" : undefined}
                  aria-current={isHere ? "page" : undefined}
                  onClick={onSign(i)}
                  onFocus={() => setHi(i, true)}
                  onPointerEnter={() => !live && setHi(i, true)}
                  data-cursor={isHere ? "open" : "steer"}
                  style={{ "--slot": i } as CSSProperties}
                >
                  <span className={styles.signTop}>
                    <kbd className={styles.key}>{i + 1}</kbd>
                    <span className={styles.glyph} aria-hidden>
                      {isHere ? "●" : s.glyph}
                    </span>
                    {isNext ? <span className={`${styles.flag} t-hud`}>Continue</span> : null}
                    {isHere ? <span className={`${styles.flag} t-hud`} data-here>You are here</span> : null}
                  </span>
                  <span className={styles.signName}>{s.label}</span>
                  <span className={`${styles.signLine} t-hud`}>{isHere ? "Back to the top" : s.chapter}</span>
                  <span className={`${styles.signMore} t-small`}>{isHere ? "You are on this page." : s.line}</span>
                </a>
              </li>
            );
          })}
        </ol>

        {fallback ? null : (
          <div className={styles.controls}>
            <div className={styles.compass}>
              <RotaryKnob label="Steer" value={hi} min={0} max={SLOTS.length - 1} step={1} ticks={SLOTS.length} onChange={(v) => setHi(v)} format={(v) => SLOTS[v]!.label} size="s" />
            </div>
            <div className={styles.meter}>
              <p className="t-hud">
                {here === hi ? "You are here" : `Scroll to go to ${dest.label}`}
                <span className={styles.meterPct} aria-hidden>
                  <span className="t-num" data-charge />
                </span>
              </p>
              <span className={styles.bar} aria-hidden>
                <span />
              </span>
            </div>
            <p className={`${styles.hint} t-small`} data-on={hint ? "1" : undefined} aria-hidden>
              {touch ? "Swipe sideways to choose. Swipe up to go." : "Steer with your cursor. Scroll to go."}
            </p>
          </div>
        )}

        <footer className={styles.strip}>
          <span>© {new Date().getFullYear()} Scyte, Hyderabad</span>
          <Clock />
          <CopyEmail />
          <a href={SITE.socials.instagram} target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <a href={SITE.socials.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          <span>Orders you recovered this visit: {recovered}</span>
          <span>No cookies. No trackers. Stamps you collect stay in this browser.</span>
        </footer>
      </div>
    </SceneSection>
  );
}
