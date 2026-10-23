"use client";

import { useEffect, useRef } from "react";
import { SceneSection } from "@/components/gl/SceneSection";
import { readAnchor } from "@/components/gl/anchors";
import { LINE_STATIONS, line } from "@/components/gl/scenes/line/line";
import { scroller } from "@/components/providers/SmoothScroll";
import { ScrubTimeline } from "@/components/kit/ScrubTimeline";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { gl, ui, useStore } from "@/lib/store";
import { useAttract } from "@/lib/idle";
import { count } from "@/lib/economics";
import styles from "./ProductHero.module.css";

export const STATIONS = LINE_STATIONS;

const jumpTo = (id: string) => {
  const t = document.getElementById(id);
  if (!t) return;
  if (scroller.lenis) scroller.lenis.scrollTo(t, { offset: 2 });
  else t.scrollIntoView({ behavior: "smooth" });
};

/** Labels pinned over the six stations in the 3D line, read from the scene's anchors each frame. */
function StationLabels() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    // the copy, the status and the timeline are no place for a label: their boxes are
    // read in scroll and resize events, never inside the frame
    let keepOut: DOMRect[] = [];
    const measure = () => {
      keepOut = Array.from(document.querySelectorAll("[data-keep-clear]")).map((el) => el.getBoundingClientRect());
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    // a label is drawn to the right of its point: test its whole box
    const blocked = (x: number, y: number) => keepOut.some((r) => x - 4 < r.right && x + 150 > r.left && y - 30 < r.bottom && y + 30 > r.top);
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const live = gl.get().scene === "line" && gl.get().visible && ui.get().webgl === "ready";
      const { hover, station } = line.get();
      LINE_STATIONS.forEach((s, i) => {
        const el = refs.current[i];
        if (!el) return;
        const a = readAnchor(`line-${s.id}`);
        const on = live && !!a?.onScreen && !blocked(a.x, a.y) ? "1" : "0";
        if (el.dataset.on !== on) el.dataset.on = on;
        const hot = hover === i ? "hover" : station === i ? "here" : "";
        if (el.dataset.hot !== hot) el.dataset.hot = hot;
        if (a && on === "1") {
          const t = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
          if (el.style.transform !== t) el.style.transform = t;
        }
      });
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, []);
  return (
    <div className={styles.labels} aria-hidden>
      {LINE_STATIONS.map((s, i) => (
        <div
          key={s.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={styles.label}
          data-on="0"
        >
          <span className={styles.labelStem} />
          <span className={styles.labelText}>
            <span className={`${styles.labelN} t-hud`}>{s.n}</span>
            <span className={styles.labelName}>{s.name}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** What the line is doing, counted by the scene itself. */
function Status() {
  const onBelt = useStore(line, (s) => s.onBelt);
  const messaged = useStore(line, (s) => s.messaged);
  const held = useStore(line, (s) => s.heldOut);
  const station = useStore(line, (s) => s.station);
  return (
    <dl className={styles.status} aria-label="The line right now">
      <div>
        <dt className="t-hud">Aarav is at</dt>
        <dd>
          {LINE_STATIONS[station]?.n} {LINE_STATIONS[station]?.name}
        </dd>
      </div>
      <div>
        <dt className="t-hud">On the belt</dt>
        <dd className="t-fig">{count(onBelt)}</dd>
      </div>
      <div>
        <dt className="t-hud">Through to Measure</dt>
        <dd className="t-fig">{count(messaged)}</dd>
      </div>
      <div>
        <dt className="t-hud">Held out on purpose</dt>
        <dd className="t-fig">{count(held)}</dd>
      </div>
    </dl>
  );
}

/**
 * P1, The Line. The product page opens on the whole machine: six stations along one
 * glass belt, drops of light riding it, one in ten peeled off at Decide into the
 * holdout lane. Aarav's token rides it too; his timeline moves it. Hover a station to
 * lift it, click it to go there.
 */
export function ProductHero() {
  const root = useRef<HTMLDivElement>(null);
  const station = useStore(line, (s) => s.station);
  const jump = useStore(line, (s) => s.jump);

  // a click on a station in the scene scrolls to it
  useEffect(() => {
    if (jump.id) jumpTo(jump.id);
  }, [jump]);

  // attract: Aarav walks the line on his own while the visitor is still
  useAttract(root, () => line.set((s) => ({ station: (s.station + 1) % LINE_STATIONS.length })), 2600);

  // the copy arrives like parts on a conveyor: each line slides in from the left
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-belt]", { xPercent: -104 }, { xPercent: 0, duration: 1.15, ease: "snap", stagger: 0.11, delay: 0.2 });
      gsap.fromTo("[data-part]", { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: "glide", stagger: 0.07, delay: 0.55 });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <SceneSection scene="line" id="machine-top" className={styles.hero} aria-label="The machine">
      <div ref={root} className={styles.sticky} data-motion-own>
        <StationLabels />
        <div className={styles.copy} data-keep-clear>
          <p className={`${styles.kicker} t-hud`} data-part>
            WhatsApp recovery for online stores
          </p>
          <h1 className={styles.title}>
            <span className={styles.mask}>
              <span data-belt>Six stations</span>
            </span>
            <span className={styles.mask}>
              <span data-belt>between a page view</span>
            </span>
            <span className={styles.mask}>
              <span data-belt>and proof.</span>
            </span>
          </h1>
        </div>
        <div className={styles.side} data-part data-keep-clear>
          <p className={styles.lede}>
            We watch how shoppers behave, work out who really intends to buy, and send one consented WhatsApp message that recovers the
            cart, the failed payment or the risky cash-on-delivery order. Then we prove the money against a holdout.
          </p>
          <p className={`${styles.note} t-small`}>Every drop on the belt is a shopper. One in ten is held out on purpose; the columns fill to illustrative order rates from our business model.</p>
        </div>
        <div className={styles.bottom} data-no-gl>
          <Status />
          <div className={styles.timeline} data-part data-keep-clear>
            <p className={`${styles.tlLabel} t-hud`}>Aarav’s 20 minutes. Drag him along the line.</p>
            <ScrubTimeline
              label="Aarav’s place on the line"
              index={station}
              onChange={(i) => line.set({ station: i })}
              stops={LINE_STATIONS.map((s) => ({ id: s.id, label: `${s.at}`, sub: s.name }))}
            />
          </div>
          <nav className={styles.jump} aria-label="Go to a station" data-part>
            {LINE_STATIONS.map((s, i) => (
              <button key={s.id} type="button" className={styles.jumpBtn} onClick={() => jumpTo(s.id)} data-current={i === station ? "1" : undefined} data-cursor="open">
                <span className="t-hud">{s.n}</span>
                <span>{s.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </SceneSection>
  );
}
