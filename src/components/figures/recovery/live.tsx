"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { iso, translateAlong, type Point3 } from "@/components/iso/iso-kit";
import { Plate } from "@/components/iso/react/draw";
import { gsap, prefersReducedMotion, ScrollTrigger } from "@/lib/motion";
import { scroller } from "@/components/providers/SmoothScroll";
import { sfx } from "@/lib/sound";
import type { MachineArt } from "./art";
import { DIAL_CENTER, DRUM_SLOTS, LAMP } from "./geometry";
import { IN_FLIGHT, poseOf, READOUT_REST, readoutOf, shoppersAt, stationsAt } from "./model";
import { CHEST, CHEST_H, DIAL, DIAL_TOP, DRAWER_OUT, DRUM, GATE_X, HEIGHT, HOPPER_X, HOPPER_Z, LANE, P, PRESS_TOP, PRESS_X, STAMP, TRAY, WIDTH } from "./view";
import "@/components/iso/iso.css";
import styles from "./machine.module.css";

/** The six parts, in the order they arrive, with what each one does. */
export const PARTS = [
  { id: "hopper", n: "01", name: "The tracker", line: "Records what the shopper did: the product views, the size chart, the cart, checkout." },
  { id: "gate", n: "02", name: "Consent", line: "Nothing moves until the shopper has said yes to messages on WhatsApp." },
  { id: "chest", n: "03", name: "Reason codes", line: "The payment gateway's reason sorts every failure into its own drawer." },
  { id: "dial", n: "04", name: "Timing", line: "Waits a few seconds after the failure, and never sends in quiet hours." },
  { id: "press", n: "05", name: "The playbook", line: "Presses the message that fixes that reason: a retry, another method, cash on delivery, the saved cart." },
  { id: "holdout", n: "06", name: "The holdout", line: "One in ten hears nothing, on purpose. That is how you know the other nine worked." },
] as const;

/** Scroll, as a fraction of the section, at which each part starts to fall; shoppers run after the last lands. */
const DROP_AT = [0.06, 0.115, 0.17, 0.225, 0.28, 0.335];
const DROP_FOR = 0.07;
const RUN_AT = 0.42;
const FALL = 170;
/** Then it is taken apart: each part springs out in turn, hangs, and slams back. */
const APART = { out: 0.57, back: 0.76, step: 0.013, span: 0.065 };
/** Where each part goes in the exploded view: back parts up and back, front parts up and forward. */
const APART_BY: Point3[] = [
  [-34, 8, 74],
  [-14, 40, 44],
  [6, -44, 88],
  [26, -30, 58],
  [30, 16, 96],
  [26, -22, 74],
];
/** Each part's top at rest: its tag hangs above it and it tumbles about its middle. */
const TOPS: Point3[] = [
  [HOPPER_X, LANE, HOPPER_Z + 16],
  [GATE_X, LANE, 24],
  [CHEST.x + CHEST.w / 2, CHEST.y + CHEST.d / 2, CHEST_H + 4],
  [DIAL.cx, DIAL.cy, DIAL_TOP + 3],
  [PRESS_X, LANE, PRESS_TOP + 10],
  [DRUM.cx, DRUM.cy, DRUM.h + 9],
];
const TRAY_MID: Point3 = [TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d / 2, 8];
const SVG_NS = "http://www.w3.org/2000/svg";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const bounce = (t: number) => {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t - 1.5 / d) ** 2 + 0.75;
  if (t < 2.5 / d) return n * (t - 2.25 / d) ** 2 + 0.9375;
  return n * (t - 2.625 / d) ** 2 + 0.984375;
};
/** Out past the mark and back: a spring let go. */
const overshoot = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2);
/** A squash at each contact of the bounce. */
const impact = (t: number) => [0.364, 0.727, 0.909].reduce((sum, c, k) => sum + Math.exp(-(((t - c) / 0.035) ** 2)) * [0.09, 0.04, 0.02][k]!, 0);
const f1 = (v: number) => v.toFixed(1);

/**
 * The anatomy of a recovery: a bench machine that assembles itself part by part as the
 * page scrolls, then runs. Each shopper drops from the tracker, waits at the consent
 * gate, is sorted by reason, timed, stamped with the matching message and sent to the
 * tray, except one in ten, which is held out and dropped in the drum.
 */
export function MachineLive({ art }: { art: MachineArt }) {
  const section = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const tokens = useRef<(SVGGElement | null)[]>([]);
  const drawers = useRef<(SVGGElement | null)[]>([]);
  const cards = useRef<(SVGGElement | null)[]>([]);
  const slots = useRef<(SVGCircleElement | null)[]>([]);
  const arm = useRef<SVGGElement>(null);
  const knob = useRef<SVGGElement>(null);
  const head = useRef<SVGGElement>(null);
  const needle = useRef<SVGPathElement>(null);
  const lamp = useRef<SVGCircleElement>(null);
  const readout = useRef<HTMLElement | null>(null);
  const tags = useRef<(SVGGElement | null)[]>([]);
  const sparks = useRef<SVGGElement>(null);
  const slide = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    const root = section.current;
    const art = svg.current;
    if (!root || !art) return;
    readout.current = root.querySelector<HTMLElement>("[data-readout]");
    const plate = root.querySelector<HTMLElement>(".iso-plate");
    const groups = PARTS.map((part) => Array.from(art.querySelectorAll<SVGGElement>(`[data-part="${part.id}"]`)));
    const marks = PARTS.map((part) => art.querySelector<SVGGElement>(`[data-part="mark-${part.id}"]`));
    const base = Array.from(art.querySelectorAll<SVGGElement>(`[data-part="base"]`));
    const reduced = prefersReducedMotion();
    const st = { raw: 0, q: 0, landed: PARTS.map(() => false), home: PARTS.map(() => true), clock: 0, last: performance.now(), done: -1, sent: 0, held: 0, inView: false, shown: -1, boost: 0, apart: false };
    const mids = TOPS.map(([x, y, z]) => iso([x, y, z / 2], P));
    const feet = TOPS.map(([x, y]) => iso([x, y, 0], P));

    const trigger = ScrollTrigger.create({ trigger: root, start: "top top", end: "bottom bottom", onUpdate: (self) => void (st.raw = self.progress) });
    const seen = new IntersectionObserver(([e]) => void (st.inView = Boolean(e?.isIntersecting)), { rootMargin: "120px 0px" });
    seen.observe(root);

    const thump = (strength = 1) => {
      sfx.relay();
      if (reduced) return;
      plate?.animate(
        [{ transform: "none" }, { transform: `translateY(${7 * strength}px) rotate(${0.3 * strength}deg)` }, { transform: `translateY(${-2 * strength}px)` }, { transform: "none" }],
        { duration: 360, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
    };

    // a click throws the machine into overdrive
    const figure = root.querySelector<HTMLElement>("[data-machine-figure]");
    const kick = () => {
      if (st.q < RUN_AT || reduced) return;
      st.boost = Math.min(6, st.boost + 2.6);
      sfx.ratchet(0.8);
      plate?.animate([{ transform: "none" }, { transform: "rotate(-0.6deg) scale(1.01)" }, { transform: "rotate(0.5deg)" }, { transform: "none" }], { duration: 300, easing: "ease-out" });
    };
    figure?.addEventListener("pointerdown", kick);

    // every message sent throws gold out of the tray
    const confetti = (x: number, y: number) => {
      const layer = sparks.current;
      if (!layer || reduced) return;
      for (let k = 0; k < 14; k++) {
        const r = document.createElementNS(SVG_NS, "rect");
        const size = 2.4 + Math.random() * 3;
        r.setAttribute("x", f1(x - size / 2));
        r.setAttribute("y", f1(y - size / 2));
        r.setAttribute("width", f1(size));
        r.setAttribute("height", f1(size * (0.6 + Math.random() * 0.8)));
        r.setAttribute("class", styles.spark!);
        r.dataset.tone = String(k % 3);
        layer.appendChild(r);
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2;
        const speed = 34 + Math.random() * 46;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;
        const spin = (Math.random() - 0.5) * 720;
        r.animate(
          [
            { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
            { transform: `translate(${f1(dx)}px, ${f1(dy)}px) rotate(${f1(spin / 2)}deg)`, opacity: 1, offset: 0.42 },
            { transform: `translate(${f1(dx * 1.4)}px, ${f1(dy * 0.3 + 70)}px) rotate(${f1(spin)}deg)`, opacity: 0 },
          ],
          { duration: 1200 + Math.random() * 500, easing: "cubic-bezier(.15,.7,.35,1)" },
        ).onfinish = () => r.remove();
      }
    };

    const needleAt = (angle: number) => {
      const [cx, cy] = DIAL_CENTER;
      const tip = iso([cx + Math.sin(angle) * 14, cy - Math.cos(angle) * 14, DIAL_TOP + 0.4], P);
      const tail = iso([cx - Math.sin(angle) * 4, cy + Math.cos(angle) * 4, DIAL_TOP + 0.4], P);
      return `M${f1(tail[0])} ${f1(tail[1])}L${f1(tip[0])} ${f1(tip[1])}`;
    };
    needle.current?.setAttribute("d", needleAt(0));

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - st.last) / 1000);
      st.last = now;
      if (!st.inView) return;
      st.q = reduced ? st.raw : st.q + (st.raw - st.q) * (1 - Math.exp(-dt * 8));
      const q = st.q;

      // the plate first, then each part tumbles onto its mark, squashes, bounces; later the
      // whole machine is taken apart, hangs in the air, and slams back together
      const b = clamp(q / 0.05);
      base.forEach((g) => {
        g.style.opacity = String(b);
        g.setAttribute("transform", translateAlong(P, [0, 0, -18 * (1 - b)]));
      });
      if (slide.current) slide.current.style.transform = `translate3d(${f1(-q * 46)}vw, 0, 0)`;
      let landed = -1;
      let most = 0;
      PARTS.forEach((part, i) => {
        const t = clamp((q - DROP_AT[i]!) / DROP_FOR);
        const fall = reduced ? (t > 0.5 ? 0 : FALL) : FALL * (1 - bounce(t));
        const out = clamp((q - APART.out - i * APART.step) / APART.span);
        const back = clamp((q - APART.back - i * APART.step) / APART.span);
        const apart = reduced ? 0 : overshoot(out) * (1 - bounce(back));
        most = Math.max(most, apart);
        const by = APART_BY[i]!;
        let transform = translateAlong(P, [by[0] * apart, by[1] * apart, fall + by[2] * apart]);
        const spin = reduced ? 0 : (1 - t) * (i % 2 ? 1 : -1) * 40 + apart * (i % 2 ? -1 : 1) * 6;
        const [mx, my] = mids[i]!;
        if (Math.abs(spin) > 0.01) transform += ` rotate(${spin.toFixed(2)} ${f1(mx)} ${f1(my)})`;
        const squash = reduced ? 0 : impact(t) + impact(back) * 1.3;
        const [fx, fy] = feet[i]!;
        if (squash > 0.002) transform += ` translate(${f1(fx)} ${f1(fy)}) scale(${(1 + squash).toFixed(3)} ${(1 - squash).toFixed(3)}) translate(${f1(-fx)} ${f1(-fy)})`;
        groups[i]!.forEach((g) => {
          g.setAttribute("transform", transform);
          g.style.opacity = String(clamp(t * 6));
        });
        const mark = marks[i];
        if (mark) mark.style.opacity = String(b * (1 - clamp((t - 0.3) * 3)));
        const down = t > 0.36;
        if (down && !st.landed[i] && q > st.raw - 0.01) thump();
        st.landed[i] = down;
        // back on its mark after being taken apart
        const home = back > 0.36 || out <= 0;
        if (home && !st.home[i] && back > 0.36) thump(1.4);
        st.home[i] = home;
        if (t > 0.36) landed = i;
        // the tags of the exploded view
        const tag = tags.current[i];
        if (tag) {
          const lifted = iso([TOPS[i]![0] + by[0] * apart, TOPS[i]![1] + by[1] * apart, TOPS[i]![2] + by[2] * apart + 16], P);
          tag.setAttribute("transform", `translate(${f1(lifted[0])} ${f1(lifted[1])})`);
          tag.style.opacity = String(clamp((apart - 0.35) * 2.5));
        }
      });
      if (landed !== st.shown) {
        st.shown = landed;
        setActive(landed);
        if (q < RUN_AT && readout.current) readout.current.textContent = landed < 0 ? READOUT_REST : `Built ${landed + 1} of ${PARTS.length}`;
      }
      const apart = most > 0.5;
      if (apart !== st.apart) {
        st.apart = apart;
        root.dataset.apart = apart ? "1" : "0";
        if (readout.current) readout.current.textContent = apart ? `Taken apart · ${PARTS.length} parts, one recovery` : st.sent + st.held ? `Whole again · sent ${st.sent} · held out ${st.held}` : "Whole again";
      }

      // then it runs: the clock only moves while the machine is whole, faster the harder
      // the page is scrolled, and in overdrive after a click
      const running = q >= RUN_AT;
      const velocity = Math.abs(scroller.lenis?.velocity ?? 0);
      st.boost *= Math.exp(-dt * 1.1);
      const rate = 1 + Math.min(2.4, velocity * 0.05) + st.boost;
      if (running && !reduced && most < 0.05) st.clock += dt * rate;
      if (figure) figure.dataset.turbo = rate > 2.2 ? "1" : "0";
      const list = running ? shoppersAt(reduced ? 4.3 : st.clock) : [];
      tokens.current.forEach((g, slot) => {
        if (!g) return;
        const p = list.find((s) => s.n % IN_FLIGHT === slot);
        if (!p) {
          g.style.opacity = "0";
          return;
        }
        const pose = poseOf(p);
        g.setAttribute("transform", translateAlong(P, [pose.x, pose.y, pose.z]));
        g.style.opacity = (pose.alpha * (1 - most)).toFixed(3);
        g.dataset.state = pose.message ? "message" : "waiting";
        // a shopper leaving the belt: count it, say what happened to it, and celebrate a send
        if (p.u > 0.84 && p.n > st.done) {
          st.done = p.n;
          if (p.holdout) st.held++;
          else {
            st.sent++;
            const [x, y] = iso(TRAY_MID, P);
            confetti(x, y);
          }
          if (readout.current) readout.current.textContent = readoutOf(p, st.held, st.sent);
        }
      });
      const s = stationsAt(list);
      arm.current?.setAttribute("transform", translateAlong(P, [0, 0, s.arm * 9]));
      knob.current?.setAttribute("transform", translateAlong(P, [running ? 16 : 0, 0, 0]));
      head.current?.setAttribute("transform", translateAlong(P, [0, 0, -s.head * STAMP]));
      drawers.current.forEach((g, i) => g?.setAttribute("transform", translateAlong(P, [0, s.drawers[i]! * DRAWER_OUT, 0])));
      needle.current?.setAttribute("d", needleAt(s.needle));
      if (lamp.current) lamp.current.style.opacity = String(0.25 + s.lamp * 0.75);
      cards.current.forEach((g, i) => g && (g.style.opacity = st.sent > i ? "1" : "0"));
      slots.current.forEach((c, i) => c && (c.dataset.on = st.held > i ? "1" : "0"));
    };
    gsap.ticker.add(tick);
    tick();
    return () => {
      gsap.ticker.remove(tick);
      trigger.kill();
      seen.disconnect();
      figure?.removeEventListener("pointerdown", kick);
    };
  }, []);

  return (
    <section ref={section} className={`${styles.section} iso`} data-theme="light" aria-labelledby="machine-title" data-motion-own>
      <div className={styles.sticky}>
        <div ref={slide} className={styles.slide} aria-hidden>
          {Array.from({ length: 6 }, () => "Taken apart").join(" · ")}
        </div>
        <p className={styles.ghost} aria-hidden>
          <span key={active}>{String(Math.max(1, active + 1)).padStart(2, "0")}</span>
        </p>
        <div className={styles.copy}>
          <p className={`${styles.kicker} t-hud`}>Anatomy of a recovery</p>
          <h2 id="machine-title" className={styles.title} style={{ "--fill": (active + 1) / PARTS.length } as CSSProperties}>
            One recovery, <span>taken apart.</span>
          </h2>
          <ol className={styles.list} onPointerLeave={() => setFocus(null)}>
            {PARTS.map((part, i) => (
              <li key={part.id} data-on={i <= active ? "1" : "0"} data-now={i === active ? "1" : "0"} onPointerEnter={() => setFocus(part.id)} onFocus={() => setFocus(part.id)} tabIndex={0}>
                <span className={styles.n}>{part.n}</span>
                <span className={styles.name}>{part.name}</span>
                <span className={styles.line}>{part.line}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className={styles.figure} data-focus={focus ?? undefined} data-machine-figure data-cursor="tap" data-cursor-label="Faster">
          <Plate
            fig="Fig 1"
            title="The recovery machine"
            hint="Scroll to build it · click to run it faster"
            readout={READOUT_REST}
            keys={[
              { mark: "lit", label: "A shopper, turned into a message" },
              { mark: "raised", label: "A shopper held out" },
              { mark: "dashed", label: "Where a part will stand" },
            ]}
          >
            <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="A bench machine: a tracker drops shoppers onto a belt, a consent gate lifts, a chest of four reason drawers sorts them, a dial times them, a press stamps the matching message, and one in ten falls into a holdout drum." focusable="false">
              {art.back}
              {/* each moving piece: the outer group falls in with its part, the inner one works */}
              <g data-part="chest">
                {art.drawers.map((el, i) => (
                  <g key={`d${i}`} ref={(g) => void (drawers.current[i] = g)}>
                    {el}
                  </g>
                ))}
              </g>
              {art.dial}
              <g data-part="dial">
                <path ref={needle} className="iso-line" data-tone="hi" d="" style={{ strokeWidth: 1.1 }} />
                {art.dialCap}
                <circle ref={lamp} className={styles.lamp} cx={LAMP[0]} cy={LAMP[1]} r={1.6} />
              </g>
              {art.posts}
              {Array.from({ length: IN_FLIGHT }, (_, i) => (
                <g key={`t${i}`} ref={(g) => void (tokens.current[i] = g)} className={styles.token} style={{ opacity: 0 } as CSSProperties}>
                  {art.token}
                </g>
              ))}
              {art.overBelt}
              <g data-part="gate">
                <g ref={arm}>{art.arm}</g>
              </g>
              {art.gateFront}
              <g data-part="press">
                <g ref={head}>{art.head}</g>
              </g>
              {art.pressFront}
              <g data-part="gate">
                <g ref={knob}>{art.knob}</g>
              </g>
              <g data-part="holdout">
                {DRUM_SLOTS.map(([x, y], i) => (
                  <circle key={i} ref={(c) => void (slots.current[i] = c)} className={styles.slot} cx={x} cy={y} r={1.15} />
                ))}
              </g>
              {art.tray}
              <g data-part="holdout">
                {art.cards.map((el, i) => (
                  <g key={`c${i}`} ref={(g) => void (cards.current[i] = g)} style={{ opacity: 0 }}>
                    {el}
                  </g>
                ))}
              </g>
              <g ref={sparks} />
              {/* the exploded view's tags, one per part */}
              {PARTS.map((part, i) => (
                <g key={part.id} ref={(g) => void (tags.current[i] = g)} className={styles.tag} style={{ opacity: 0 }}>
                  <line x1={0} y1={0} x2={0} y2={14} />
                  {/* the last part sits at the card's right edge, so its tag hangs to the left */}
                  <g transform={i === PARTS.length - 1 ? `translate(${12 - (part.name.length * 5.6 + 30)} 0)` : undefined}>
                    <rect x={-6} y={-17} width={part.name.length * 5.6 + 30} height={17} rx={3} />
                    <text x={2} y={-5.4} className={styles.tagN}>
                      {part.n}
                    </text>
                    <text x={19} y={-5.4}>
                      {part.name}
                    </text>
                  </g>
                </g>
              ))}
            </svg>
          </Plate>
        </div>
      </div>
    </section>
  );
}
