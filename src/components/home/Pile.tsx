"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { TransitionLink } from "@/components/transition/navigation";
import { sfx } from "@/lib/sound";
import styles from "./Pile.module.css";

/** Messages the playbooks send, and what the shopper does next. */
const CHIPS = [
  "Retry in one tap",
  "Pay by UPI",
  "Cash on delivery",
  "Your cart is saved",
  "Order confirmed",
  "Back in stock",
  "₹1,499 paid",
  "Out for delivery",
  "UPI_TIMEOUT → fixed",
  "Thanks, Aarav",
  "Size M reserved",
  "COD confirmed",
  "Retry in one tap",
  "Payment received",
  "Your cart is saved",
  "Pay by UPI",
  "Order confirmed",
  "BANK_DECLINE → fixed",
  "Cash on delivery",
  "Out for delivery",
  "₹2,199 paid",
  "Back in stock",
  "Thanks, Meera",
  "Order confirmed",
  "Retry in one tap",
  "COD confirmed",
];

type Body = { el: HTMLElement; x: number; y: number; vx: number; vy: number; a: number; va: number; w: number; h: number; born: number; asleep: boolean };

const GRAVITY = 2600;

/**
 * The last word before the Junction: a giant RECOVERED, and the messages the
 * playbooks send raining onto it. They tumble, bounce, pile on the letters and on each
 * other, and the cursor knocks them about. A click throws the lot back in the air.
 */
export function Pile() {
  const root = useRef<HTMLElement>(null);
  const word = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const box = root.current;
    const floorEl = word.current;
    if (!box || !floorEl) return;
    // a phone's column holds about half the chips before the pile buries the copy
    const all = Array.from(box.querySelectorAll<HTMLElement>("[data-chip]"));
    const els = all.slice(0, box.clientWidth < 720 ? 12 : all.length);
    all.slice(els.length).forEach((el) => (el.hidden = true));
    const reduced = prefersReducedMotion();
    const bodies: Body[] = els.map((el, i) => ({ el, x: 0, y: -400, vx: 0, vy: 0, a: 0, va: 0, w: el.offsetWidth, h: el.offsetHeight, born: i * 0.075, asleep: false }));
    const st = { on: false, vis: false, t: 0, last: performance.now(), px: -9999, py: -9999, pvx: 0, pvy: 0, W: 0, H: 0, floor: 0, left: 0, right: 0, landed: 0 };

    const letters = Array.from(floorEl.querySelectorAll<HTMLElement>("[data-letter]"));
    let spans: [number, number][] = [];
    // a chip that hits the word knocks the letter under it down
    const dent = (x: number, speed: number) => {
      const k = spans.findIndex(([l, r]) => x > l && x < r);
      const d = Math.min(18, speed / 90);
      letters[k]?.animate([{ transform: "none" }, { transform: `translateY(${d.toFixed(1)}px) scale(1.03, ${(1 - d / 220).toFixed(3)})` }, { transform: "none" }], {
        duration: 460,
        easing: "cubic-bezier(.2,.9,.3,1.25)",
      });
    };

    const measure = () => {
      const r = box.getBoundingClientRect();
      const f = floorEl.getBoundingClientRect();
      st.W = r.width;
      st.H = r.height;
      // the chips land on the cap height of the giant word, or on the floor beside it
      st.floor = f.top - r.top + f.height * 0.12;
      st.left = f.left - r.left;
      st.right = f.right - r.left;
      bodies.forEach((b) => {
        b.w = b.el.offsetWidth;
        b.h = b.el.offsetHeight;
      });
      spans = letters.map((l) => {
        const s = l.getBoundingClientRect();
        return [s.left - r.left, s.right - r.left];
      });
    };
    measure();

    const drop = () => {
      bodies.forEach((b, i) => {
        b.x = st.W * (0.08 + 0.84 * ((i * 0.618) % 1)) - b.w / 2;
        b.y = -b.h - 40 - (i % 5) * 50;
        b.vx = (Math.random() - 0.5) * 220;
        b.vy = 0;
        b.a = (Math.random() - 0.5) * 60;
        b.va = (Math.random() - 0.5) * 360;
        b.asleep = false;
      });
    };

    if (reduced) {
      // a still pile: chips resting along the top of the word
      bodies.forEach((b, i) => {
        b.x = st.left + ((i * 0.37) % 1) * Math.max(0, st.right - st.left - b.w);
        b.y = st.floor - b.h * (1 + (i % 3) * 0.9);
        b.a = ((i * 37) % 24) - 12;
        b.el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0) rotate(${b.a}deg)`;
        b.el.style.opacity = "1";
      });
      return;
    }

    const groundAt = (b: Body) => {
      const cx = b.x + b.w / 2;
      return cx > st.left && cx < st.right ? st.floor : st.H - 8;
    };

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(1 / 30, (now - st.last) / 1000);
      st.last = now;
      if (!st.on || !st.vis) return;
      st.t += dt;
      let moving = 0;
      for (const b of bodies) {
        if (st.t < b.born) continue;
        b.el.style.opacity = "1";
        // the cursor shoves whatever it passes through
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        const dx = cx - st.px;
        const dy = cy - st.py;
        const d = Math.hypot(dx, dy);
        if (d < 110 && (Math.abs(st.pvx) + Math.abs(st.pvy) > 40 || d < 50)) {
          const k = (1 - d / 110) * 1;
          b.vx += (dx / (d || 1)) * 900 * k + st.pvx * 0.6 * k;
          b.vy += -650 * k + st.pvy * 0.3 * k;
          b.va += (Math.random() - 0.5) * 900 * k;
          b.asleep = false;
        }
        // land on the word, the floor, or a chip below; a sleeper whose support was
        // knocked away wakes and falls
        let ground = groundAt(b);
        for (const o of bodies) {
          if (o === b || st.t < o.born || o.y < b.y) continue;
          const overlapX = Math.min(b.x + b.w, o.x + o.w) - Math.max(b.x, o.x);
          if (overlapX > Math.min(b.w, o.w) * 0.28) ground = Math.min(ground, o.y);
        }
        if (b.asleep && b.y + b.h < ground - 1) b.asleep = false;
        if (b.asleep) continue;
        b.vy += GRAVITY * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.a += b.va * dt;
        // walls
        if (b.x < 0) {
          b.x = 0;
          b.vx = Math.abs(b.vx) * 0.5;
        }
        if (b.x + b.w > st.W) {
          b.x = st.W - b.w;
          b.vx = -Math.abs(b.vx) * 0.5;
        }
        if (b.y + b.h > ground) {
          b.y = ground - b.h;
          if (b.vy > 420) {
            if (ground === st.floor) dent(b.x + b.w / 2, b.vy);
            b.vy = -b.vy * 0.32;
            st.landed++;
            if (st.landed % 4 === 0) sfx.tick();
          } else b.vy = 0;
          b.vx *= 0.82;
          b.va *= 0.6;
          // settle the shortest way round toward a slight tilt, never upside down
          b.a = ((((b.a + 180) % 360) + 360) % 360) - 180;
          b.a += (Math.max(-14, Math.min(14, b.a)) - b.a) * 0.3;
        }
        if (Math.abs(b.vx) < 4 && Math.abs(b.vy) < 4 && Math.abs(b.va) < 4 && Math.abs(b.a) < 15 && b.y + b.h >= ground - 0.5) b.asleep = true;
        else moving++;
        b.el.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0) rotate(${b.a.toFixed(1)}deg)`;
      }
      st.pvx *= 0.8;
      st.pvy *= 0.8;
      if (!moving && st.t > bodies[bodies.length - 1]!.born + 1) st.px = -9999;
    };

    const onMove = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (st.px > -9000) {
        st.pvx = x - st.px;
        st.pvy = y - st.py;
      }
      st.px = x;
      st.py = y;
    };
    const onLeave = () => {
      st.px = -9999;
    };
    // a click, not a pointerdown, so a touch that starts a scroll throws nothing
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest("a")) return;
      sfx.whoosh();
      bodies.forEach((b) => {
        b.vy = -1200 - Math.random() * 700;
        b.vx = (Math.random() - 0.5) * 900;
        b.va = (Math.random() - 0.5) * 1080;
        b.asleep = false;
      });
    };

    const seen = new IntersectionObserver(
      ([e]) => {
        st.vis = Boolean(e?.isIntersecting);
        if (e && e.intersectionRatio >= 0.35 && !st.on) {
          st.on = true;
          st.t = 0;
          st.last = performance.now();
          measure();
          drop();
        }
      },
      { threshold: [0, 0.35] },
    );
    seen.observe(box);
    const ro = new ResizeObserver(() => measure());
    ro.observe(box);
    box.addEventListener("pointermove", onMove);
    box.addEventListener("pointerleave", onLeave);
    box.addEventListener("click", onClick);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      seen.disconnect();
      ro.disconnect();
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerleave", onLeave);
      box.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <section ref={root} className={styles.section} aria-labelledby="pile-title" data-cursor="tap" data-cursor-label="Shove">
      <div className={styles.head}>
        <p className={`${styles.kicker} t-hud`}>What the machine is for</p>
        <p className={styles.line}>Each chip is a message one of the playbooks sends, and what the shopper did next. Push them about, or click to throw them.</p>
        <TransitionLink href="/product" className={`${styles.cta} cta`} data-magnetic data-cursor="open">
          See how the machine works
        </TransitionLink>
      </div>
      <h2 id="pile-title" className="sr-only">
        Recovered.
      </h2>
      <p ref={word} className={styles.word} aria-hidden>
        {Array.from("Recovered.").map((ch, i) => (
          <span key={i} data-letter>
            {ch}
          </span>
        ))}
      </p>
      {CHIPS.map((text, i) => (
        <span key={i} className={styles.chip} data-chip data-tone={i % 4} aria-hidden>
          <i />
          {text}
        </span>
      ))}
    </section>
  );
}
