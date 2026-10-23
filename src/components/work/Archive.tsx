"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { gsap, prefersReducedMotion, springStep, SPRING } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import { SceneSection } from "@/components/gl/SceneSection";
import { TransitionLink, useTransitionRouter } from "@/components/transition/navigation";
import { releaseHandoff, showHandoff } from "@/components/transition/Handoff";
import { useChapters } from "@/components/shell/chapters";
import { THIS_SITE, THIS_SITE_SCENES, OPEN_SLOTS, WORK } from "@/data/work";
import { PLATES, archiveGl, strip, type Plate } from "./strip";
import styles from "./Archive.module.css";

/** Seconds of momentum a throw carries before the strip settles on a frame. */
const THROW = 0.24;
const N = PLATES.length;

/** The open slot drawn in HTML; the WebGL plate draws the same thing. */
function SlotArt({ plate }: { plate: Plate }) {
  return (
    <span className={styles.slotArt} aria-hidden>
      <span className="t-hud">Open slot</span>
      <span className={styles.slotTitle}>{plate.title}</span>
      <span className={styles.slotWhat}>{plate.slot?.what}</span>
    </span>
  );
}

/**
 * The Archive: a film strip of everything Scyte can show. Drag or throw it, use a
 * trackpad, the arrow keys or the slider. With WebGL the frames are drawn on the
 * persistent canvas, bending with the strip's speed and rippling under the pointer;
 * opening a frame grows it into its case. Without WebGL it is the same strip in HTML.
 */
export function Archive() {
  const vp = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const gl = useStore(archiveGl, (s) => s.ready);
  const go = useTransitionRouter();
  const ctl = useRef({ target: 0, v: 0, dragging: false, suppress: false, wheel: 0, index: 0 });
  const drag = useRef({ id: -1, x: 0, o: 0, moved: false, samples: [] as { x: number; t: number }[] });

  useChapters(
    useMemo(
      () => [
        { id: "archive", label: "Frames", target: "archive" },
        { id: "case-00", label: "Case 00", target: "case-00" },
        { id: "open", label: "Case 01", target: "open" },
      ],
      [],
    ),
  );

  const max = () => (N - 1) * strip.pitch;
  const clamp = (x: number) => Math.min(max(), Math.max(0, x));
  const nearest = (x: number) => (strip.pitch ? Math.round(clamp(x) / strip.pitch) : 0);
  const goTo = useCallback((i: number) => {
    const k = Math.min(N - 1, Math.max(0, i));
    ctl.current.target = Math.min((N - 1) * strip.pitch, Math.max(0, k * strip.pitch));
  }, []);

  // layout: the first two frames give the strip its geometry
  useEffect(() => {
    const el = vp.current;
    const tr = track.current;
    if (!el || !tr) return;
    strip.el = el;
    strip.expand = -1;
    strip.e = 0;
    const measure = () => {
      const frames = tr.querySelectorAll<HTMLElement>("[data-frame]");
      const a = frames[0];
      const b = frames[1];
      if (!a) return;
      const r = el.getBoundingClientRect();
      const ra = a.getBoundingClientRect();
      // the track is translated by -offset; measure as if it were not
      strip.x0 = ra.left - r.left + strip.offset;
      strip.y0 = ra.top - r.top;
      strip.w = ra.width;
      strip.h = ra.height;
      strip.pitch = b ? b.getBoundingClientRect().left - ra.left : ra.width;
      ctl.current.target = ctl.current.index * strip.pitch;
      strip.offset = ctl.current.target;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      strip.el = null;
      strip.hover = -1;
    };
  }, []);

  // physics, ahead of the scroll and the canvas on the shared ticker
  useEffect(() => {
    const reduced = prefersReducedMotion();
    const c = ctl.current;
    let last = performance.now();
    let prev = strip.offset;
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000) || 1 / 60;
      last = now;
      if (!c.dragging) {
        if (reduced) {
          strip.offset = c.target;
          c.v = 0;
        } else [strip.offset, c.v] = springStep(strip.offset, c.v, c.target, SPRING.dock, dt);
      }
      const v = (strip.offset - prev) / dt;
      prev = strip.offset;
      strip.vel += (v - strip.vel) * (1 - Math.exp(-dt * 14));
      if (track.current) track.current.style.transform = `translate3d(${(-strip.offset).toFixed(2)}px,0,0)`;
      const i = nearest(strip.offset);
      if (i !== c.index) {
        c.index = i;
        setActive(i);
        sfx.tick();
      }
    };
    gsap.ticker.add(tick, false, true);
    return () => gsap.ticker.remove(tick);
    // nearest reads module state only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // trackpads and shift+wheel move the strip; plain vertical wheel scrolls the page
  useEffect(() => {
    const el = vp.current;
    if (!el) return;
    const c = ctl.current;
    const onWheel = (e: WheelEvent) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx || strip.expand >= 0) return;
      e.preventDefault();
      e.stopPropagation();
      c.target = clamp(c.target + dx);
      window.clearTimeout(c.wheel);
      c.wheel = window.setTimeout(() => {
        c.target = clamp(nearest(c.target) * strip.pitch);
      }, 160);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoverAt = (x: number, y: number) => {
    const el = vp.current;
    if (!el || strip.expand >= 0) return;
    const r = el.getBoundingClientRect();
    const lx = x - r.left - strip.x0 + strip.offset;
    const i = Math.floor(lx / strip.pitch);
    const fx = lx - i * strip.pitch;
    const fy = y - r.top - strip.y0;
    if (i >= 0 && i < N && fx >= 0 && fx <= strip.w && fy >= 0 && fy <= strip.h) {
      strip.hover = i;
      strip.mx = fx / strip.w;
      strip.my = 1 - fy / strip.h;
    } else strip.hover = -1;
  };

  const rubber = (x: number) => {
    const m = max();
    if (x < 0) return x * 0.3;
    if (x > m) return m + (x - m) * 0.3;
    return x;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || strip.expand >= 0) return;
    const d = drag.current;
    d.id = e.pointerId;
    d.x = e.clientX;
    d.o = strip.offset;
    d.moved = false;
    d.samples = [{ x: e.clientX, t: performance.now() }];
    hoverAt(e.clientX, e.clientY);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    hoverAt(e.clientX, e.clientY);
    const d = drag.current;
    if (d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < 6) return;
      d.moved = true;
      ctl.current.dragging = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.dataset.dragging = "1";
    }
    strip.offset = rubber(d.o - dx);
    const now = performance.now();
    d.samples.push({ x: e.clientX, t: now });
    while (d.samples.length > 2 && now - d.samples[0].t > 90) d.samples.shift();
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d.id !== e.pointerId) return;
    d.id = -1;
    if (e.pointerType !== "mouse") strip.hover = -1;
    if (!d.moved) return;
    const c = ctl.current;
    c.dragging = false;
    c.suppress = true;
    window.setTimeout(() => {
      c.suppress = false;
    }, 0);
    delete e.currentTarget.dataset.dragging;
    const a = d.samples[0];
    const b = d.samples[d.samples.length - 1];
    const vx = b.t > a.t ? ((b.x - a.x) / (b.t - a.t)) * 1000 : 0;
    const i = nearest(strip.offset - vx * THROW);
    // at most three frames per throw, so a flick never loses you
    const from = nearest(d.o);
    c.target = clamp(Math.min(from + 3, Math.max(from - 3, i)) * strip.pitch);
    c.v = -vx;
    haptic(8);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: N - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const i = Math.min(N - 1, Math.max(0, keys[e.key]));
    goTo(i);
    links.current[i]?.focus({ preventScroll: true });
  };

  const open = (e: MouseEvent<HTMLAnchorElement>, i: number) => {
    if (ctl.current.suppress) {
      e.preventDefault();
      return;
    }
    const p = PLATES[i];
    if (!p.img || !archiveGl.get().ready || prefersReducedMotion()) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const img = p.img;
    sfx.pour();
    void go(p.href, undefined, {
      cover: async () => {
        strip.hover = -1;
        strip.expand = i;
        strip.e = 0;
        if (vp.current) vp.current.dataset.expanding = "1";
        await gsap.to(strip, { e: 1, duration: 0.9, ease: "latch" });
        await showHandoff(img);
      },
      reveal: releaseHandoff,
    });
  };

  const current = PLATES[active];
  const progress = N > 1 ? (active / (N - 1)) * 100 : 0;

  return (
    <>
      <SceneSection scene="work" id="archive" className={styles.archive} aria-labelledby="archive-title">
        <div className={styles.head} data-gl={gl ? "1" : undefined}>
          <p className="t-hud c-khaki">Work</p>
          <h1 id="archive-title" className={styles.title}>
            The archive.
          </h1>
          <p className={styles.lede}>
            {WORK.length
              ? "Client work first, each with what changed and how we know. Then the site you are on, scene by scene."
              : "Client case studies go up here when each client signs off. Until then, case 00 is the site you are on: eight scenes, built in-house."}
          </p>
        </div>

        <div
          ref={vp}
          className={styles.viewport}
          data-motion-own
          data-gl={gl ? "1" : undefined}
          data-cursor="drag"
          role="group"
          aria-roledescription="carousel"
          aria-label="The archive, one frame per case or scene"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={() => {
            strip.hover = -1;
          }}
          onKeyDown={onKeyDown}
          onClickCapture={(e) => {
            if (ctl.current.suppress) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onDragStart={(e) => e.preventDefault()}
        >
          <ol ref={track} className={styles.track}>
            {PLATES.map((p, i) => (
              <li key={p.key} className={styles.plate} data-kind={p.kind} aria-roledescription="slide" aria-label={`${i + 1} of ${N}`}>
                <TransitionLink
                  href={p.href}
                  ref={(el) => {
                    links.current[i] = el;
                  }}
                  className={styles.link}
                  onClick={(e) => open(e, i)}
                  onFocus={() => goTo(i)}
                  draggable={false}
                  data-cursor="view"
                  data-cursor-label={p.kind === "slot" ? "Start" : "Open"}
                >
                  <span className={styles.frame} data-frame>
                    {p.img ? (
                      // the canvas draws this same file, so it is fetched once
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.img} alt="" width={1280} height={800} draggable={false} loading={i < 4 ? "eager" : "lazy"} decoding="async" />
                    ) : (
                      <SlotArt plate={p} />
                    )}
                  </span>
                  <span className={styles.cap}>
                    <span className="t-hud c-muted">{p.meta}</span>
                    <span className={styles.capTitle}>{p.title}</span>
                  </span>
                </TransitionLink>
              </li>
            ))}
            <li className={styles.end}>
              <p className="t-hud c-khaki">End of the archive</p>
              <p className={styles.endTitle}>Case 01 is open.</p>
              <TransitionLink href="/contact?intent=audit" className={styles.endLink} data-cursor="tap">
                Talk to us about yours
              </TransitionLink>
            </li>
          </ol>
        </div>

        <div className={styles.controls}>
          <p className={`${styles.count} t-fig`} aria-hidden>
            <span>{String(active + 1).padStart(2, "0")}</span>
            <span className="c-muted"> / {String(N).padStart(2, "0")}</span>
          </p>
          <label className={styles.scrub}>
            <span className="sr-only">Move through the archive</span>
            <input
              type="range"
              min={0}
              max={N - 1}
              step={1}
              value={active}
              onChange={(e) => goTo(Number(e.target.value))}
              aria-valuetext={`${active + 1} of ${N}: ${current.title}`}
              style={{ "--p": `${progress}%` } as CSSProperties}
              data-cursor="scrub"
            />
          </label>
          <p className={styles.now} aria-live="polite">
            <span className="t-hud c-muted">{current.meta}</span> <span className={styles.nowTitle}>{current.title}</span>
          </p>
          <p className={`${styles.hint} t-small c-muted`}>Drag or swipe the strip. Arrow keys work once a frame has focus.</p>
        </div>
      </SceneSection>

      <section id="case-00" className={styles.house} aria-labelledby="case-00-title">
        <div className={styles.houseText}>
          <p className="t-hud c-khaki">Case 00</p>
          <h2 id="case-00-title" className={styles.h2}>
            {THIS_SITE.title}.
          </h2>
          <p className={styles.houseLede}>{THIS_SITE.summary}</p>
          <dl className={styles.facts}>
            <div>
              <dt className="t-hud c-muted">Year</dt>
              <dd>{THIS_SITE.year}</dd>
            </div>
            <div>
              <dt className="t-hud c-muted">Built with</dt>
              <dd>{THIS_SITE.stack.join(", ")}</dd>
            </div>
          </dl>
          <TransitionLink href={`/work/${THIS_SITE.slug}`} className={styles.button} data-magnetic data-cursor="open">
            Read case 00
          </TransitionLink>
        </div>
        <ol className={styles.sheet} aria-label="The eight scenes">
          {THIS_SITE_SCENES.map((s, i) => (
            <li key={s.id}>
              <TransitionLink href={`/work/${THIS_SITE.slug}#scene-${s.id}`} className={styles.sheetLink} data-cursor="view" data-cursor-label="Open">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.img} alt="" width={1280} height={800} loading="lazy" decoding="async" />
                <span className={styles.sheetCap}>
                  <span className="t-hud c-muted">{String(i + 1).padStart(2, "0")}</span> {s.title}
                </span>
              </TransitionLink>
            </li>
          ))}
        </ol>
      </section>

      <section id="open" className={`${styles.open} band`} aria-labelledby="open-title">
        <h2 id="open-title" className={styles.h2}>
          Case 01 is open.
        </h2>
        <p className={styles.openLede}>We take on a few projects at a time. Tell us what you sell and where it leaks, and we will say plainly whether we can help.</p>
        <ul className={styles.slots}>
          {OPEN_SLOTS.map((o) => (
            <li key={o.id}>
              <TransitionLink href={o.href} className={styles.slotRow} data-cursor="tap">
                <span className={styles.slotName}>{o.service}</span>
                <span className={styles.slotLine}>{o.what}</span>
                <span className={styles.slotGo}>Start a project</span>
              </TransitionLink>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
