"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { intent } from "@/lib/intent";
import { recordEvent } from "@/lib/visit";
import { prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { useStill } from "@/lib/idle";
import { gsap } from "@/lib/motion";
import styles from "./storefront.module.css";

type Ev = { id: number; t: number; name: string; payload: string; src: "SDK" | "Shopify" | "Gateway"; demo?: boolean };

const VARIANTS = [
  { id: "forest", name: "Forest", body: "#2b3a2f", trim: "#c2b897" },
  { id: "oat", name: "Oat", body: "#cfc7aa", trim: "#334638" },
  { id: "sand", name: "Sand", body: "#c2b897", trim: "#1b261d" },
] as const;
const SIZES = ["S", "M", "L", "XL"] as const;
const CHART = [
  ["S", "96", "68"],
  ["M", "102", "70"],
  ["L", "108", "72"],
  ["XL", "114", "74"],
];

let nextId = 1;
const anon = "a91f-3c";

/** The hoodie, drawn: a flat product shot in the palette, no photograph. */
function Hoodie({ body, trim }: { body: string; trim: string }) {
  return (
    <svg viewBox="0 0 240 240" className={styles.hoodie} aria-hidden>
      <path d="M86 52c8-22 60-22 68 0l34 18 30 52-26 14-14-22v104H62V114l-14 22-26-14 30-52z" fill={body} />
      <path d="M86 52c4 26 64 26 68 0" fill="none" stroke={trim} strokeWidth="3" />
      <path d="M96 50c6-16 42-16 48 0-6 14-42 14-48 0z" fill="rgb(0 0 0 / 0.18)" />
      <path d="M108 64v26M132 64v26" stroke={trim} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="108" cy="92" r="3" fill={trim} />
      <circle cx="132" cy="92" r="3" fill={trim} />
      <path d="M90 156h60l8 34H82z" fill="rgb(0 0 0 / 0.12)" stroke={trim} strokeWidth="2" />
      <path d="M62 210h116" stroke={trim} strokeWidth="3" />
      <path d="M48 136l-4 6M192 136l4 6" stroke={trim} strokeWidth="3" />
    </svg>
  );
}

/**
 * P2, The Storefront. A working mini store in a browser frame, with the tracking script
 * visibly watching: every action sends an event token flying from the thing you
 * touched into the log, typed in as it lands, and the engaged-time counter only runs
 * while someone is really engaged (visible tab, real activity in the last five
 * seconds). The real actions also feed Aarav's intent score two stations down.
 */
export function Storefront() {
  const root = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLOListElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLSpanElement>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [variant, setVariant] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [chart, setChart] = useState(false);
  const [reviews, setReviews] = useState(false);
  const [cart, setCart] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [engaged, setEngaged] = useState(0);
  const start = useRef(0);
  const lastActive = useRef(0);
  const fired = useRef(new Set<string>());
  const still = useStill();

  const emit = useCallback((name: string, payload: string, from?: Element | null, opts: { src?: Ev["src"]; demo?: boolean; once?: boolean } = {}) => {
    if (opts.once) {
      if (fired.current.has(name)) return;
      fired.current.add(name);
    }
    if (!start.current) start.current = performance.now();
    const ev: Ev = { id: nextId++, t: (performance.now() - start.current) / 1000, name, payload, src: opts.src ?? "SDK", demo: opts.demo };
    setEvents((list) => [...list.slice(-11), ev]);
    if (!opts.demo) recordEvent({ id: ev.id, name, payload });
    sfx.key();
    // the token's flight, from what was touched to the new line in the log
    if (!from || prefersReducedMotion()) return;
    requestAnimationFrame(() => {
      const row = log.current?.querySelector<HTMLElement>(`[data-ev="${ev.id}"]`);
      if (!row) return;
      const a = from.getBoundingClientRect();
      const b = row.getBoundingClientRect();
      const token = document.createElement("span");
      token.className = styles.token;
      token.textContent = name;
      document.body.appendChild(token);
      const x0 = a.left + a.width / 2;
      const y0 = a.top + a.height / 2;
      const x1 = b.left + 60;
      const y1 = b.top + b.height / 2;
      const mx = (x0 + x1) / 2;
      const my = Math.min(y0, y1) - 80;
      row.style.opacity = "0";
      const anim = token.animate(
        [
          { transform: `translate(${x0}px, ${y0}px) translate(-50%, -50%) scale(0.6)`, opacity: 0 },
          { transform: `translate(${x0}px, ${y0 - 18}px) translate(-50%, -50%) scale(1)`, opacity: 1, offset: 0.15 },
          { transform: `translate(${mx}px, ${my}px) translate(-50%, -50%) scale(1.05)`, offset: 0.55 },
          { transform: `translate(${x1}px, ${y1}px) translate(-50%, -50%) scale(0.92)`, opacity: 1 },
        ],
        { duration: 760, easing: "cubic-bezier(0.45, 0, 0.15, 1)" },
      );
      anim.onfinish = () => {
        token.remove();
        row.style.opacity = "";
        row.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 420, easing: "steps(18, end)" });
        sfx.printLine();
      };
    });
  }, []);

  // page_view on arrival, once
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        emit("page_view", "{source: instagram_ad}", el.querySelector("[data-url]"), { once: true });
        window.setTimeout(() => emit("anonymous_id", `${anon}`, el.querySelector("[data-url]"), { once: true }), 900);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [emit]);

  // engaged time: only while the store is on screen, the tab is visible and someone did something in the last five seconds
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = Boolean(e?.isIntersecting)), { threshold: 0.3 });
    io.observe(el);
    const mark = () => (lastActive.current = performance.now());
    el.addEventListener("pointermove", mark, { passive: true });
    el.addEventListener("pointerdown", mark, { passive: true });
    el.addEventListener("wheel", mark, { passive: true });
    page.current?.addEventListener("scroll", mark, { passive: true });
    const timer = window.setInterval(() => {
      const active = visible && !document.hidden && performance.now() - lastActive.current < 5000;
      if (active) setEngaged((s) => s + 1);
    }, 1000);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
      el.removeEventListener("pointermove", mark);
      el.removeEventListener("pointerdown", mark);
      el.removeEventListener("wheel", mark);
    };
  }, []);

  useEffect(() => {
    if (engaged === 30) {
      emit("engaged_time", "{seconds: 30, visible: true}", root.current?.querySelector("[data-engaged]"), { once: true });
      intent.set({ engagedSeconds: Math.max(intent.get().engagedSeconds, 30) });
    }
  }, [engaged, emit]);

  // scroll depth inside the store page
  const onPageScroll = () => {
    const el = page.current;
    if (!el) return;
    const depth = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
    if (depth > 0.5) emit("scroll_depth", "{depth: 50%}", el, { once: true });
  };

  // attract mode: a ghost cursor browses the store while the visitor is still
  useEffect(() => {
    const el = root.current;
    const g = ghost.current;
    if (!still || !el || !g || prefersReducedMotion()) return;
    const targets = ["[data-thumb='1']", "[data-chart]", "[data-size='M']", "[data-add]", "[data-thumb='0']"];
    let i = 0;
    let alive = true;
    const step = () => {
      if (!alive) return;
      const t = el.querySelector<HTMLElement>(targets[i % targets.length]!);
      i++;
      if (!t) return;
      const box = el.getBoundingClientRect();
      const r = t.getBoundingClientRect();
      gsap.to(g, {
        x: r.left - box.left + r.width / 2,
        y: r.top - box.top + r.height / 2,
        opacity: 1,
        duration: 0.9,
        ease: "glide",
        onComplete: () => {
          if (!alive) return;
          g.animate([{ scale: 1 }, { scale: 0.8 }, { scale: 1 }], { duration: 260 });
          t.dispatchEvent(new CustomEvent("ghost-click"));
        },
      });
    };
    step();
    const timer = window.setInterval(step, 2200);
    return () => {
      alive = false;
      window.clearInterval(timer);
      gsap.to(g, { opacity: 0, duration: 0.3 });
    };
  }, [still]);

  // the ghost presses real buttons, but its events are marked demo and do not touch Aarav's score
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onGhost = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.dataset.thumb) {
        const v = Number(t.dataset.thumb);
        setVariant(v);
        emit("gallery_view", `{variant: ${VARIANTS[v]!.id}}`, t, { demo: true });
      } else if (t.dataset.chart !== undefined) {
        setChart(true);
        emit("size_chart_open", "{product: forest-hoodie}", t, { demo: true });
        window.setTimeout(() => setChart(false), 1300);
      } else if (t.dataset.size) {
        setSize(t.dataset.size);
        emit("size_select", `{size: ${t.dataset.size}}`, t, { demo: true });
      } else if (t.dataset.add !== undefined) {
        setCart((c) => c + 1);
        emit("add_to_cart", "{sku: FH-M, price: 1499}", t, { demo: true });
      }
    };
    el.addEventListener("ghost-click", onGhost, true);
    return () => el.removeEventListener("ghost-click", onGhost, true);
  }, [emit]);

  const pickVariant = (i: number, el: HTMLElement) => {
    setVariant(i);
    emit("gallery_view", `{variant: ${VARIANTS[i]!.id}}`, el);
  };
  const openChart = (el: HTMLElement) => {
    setDrawer(false);
    setChart(true);
    emit("size_chart_open", "{product: forest-hoodie}", el);
    intent.set({ sizeChart: true });
  };
  const pickSize = (s: string, el: HTMLElement) => {
    setSize(s);
    emit("size_select", `{size: ${s}}`, el);
  };
  const add = (el: HTMLElement) => {
    if (!size) {
      emit("add_to_cart_blocked", "{reason: no_size}", el);
      sfx.deny();
      return;
    }
    setCart((c) => c + 1);
    setChart(false);
    setDrawer(true);
    emit("add_to_cart", `{sku: FH-${size}, price: 1499}`, el);
    intent.set({ cart: true });
  };
  const openReviews = (el: HTMLElement) => {
    setReviews(true);
    emit("reviews_read", "{count: 3}", el);
    intent.set({ reviews: true });
  };
  const checkout = (el: HTMLElement) => {
    emit("checkout_started", "{value: 1499, items: 1}", el, { src: "Shopify" });
    intent.set({ checkout: true });
    setDrawer(false);
  };

  const v = VARIANTS[variant]!;
  const mm = String(Math.floor(engaged / 60)).padStart(2, "0");
  const ss = String(engaged % 60).padStart(2, "0");

  return (
    <section id="collect" className={styles.station} aria-label="01 Collect">
      <div ref={root} className={styles.sticky} data-motion-own>
        <header className={styles.head}>
          <span className={styles.index} aria-hidden>
            01
          </span>
          <span className={`${styles.where} t-hud`}>
            <span>Collect</span>
            <span className={styles.clock}>0:00</span>
            <span className="c-muted">Aarav lands on a hoodie page from an Instagram ad</span>
          </span>
        </header>

        <div className={styles.browser}>
          <div className={styles.chrome} data-url>
            <span className={styles.dots} aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className={styles.url}>hoodieco.example/products/forest-hoodie</span>
            <span className={`${styles.sdk} t-hud`} data-engaged>
              <span className={styles.rec} aria-hidden />
              SDK watching
            </span>
          </div>
          <div ref={page} className={styles.page} data-lenis-prevent onScroll={onPageScroll} tabIndex={0} aria-label="A demo store page you can use">
            <div className={styles.storeHead}>
              <b>Hoodie Co.</b>
              <span className="t-small">Shop</span>
              <span className="t-small">New</span>
              <span className="t-small">About</span>
              <button type="button" className={`${styles.cartBtn} t-small`} onClick={() => setDrawer(true)}>
                Cart ({cart})
              </button>
            </div>
            <div className={styles.pdp}>
              <div className={styles.gallery}>
                <div className={styles.shot} style={{ background: v.id === "forest" ? "#cfc7aa" : "#2b3a2f" }}>
                  <Hoodie body={v.body} trim={v.trim} />
                </div>
                <div className={styles.thumbs} role="group" aria-label="Colour">
                  {VARIANTS.map((x, i) => (
                    <button
                      key={x.id}
                      type="button"
                      className={styles.thumb}
                      data-thumb={i}
                      aria-pressed={i === variant}
                      onMouseEnter={(e) => i !== variant && pickVariant(i, e.currentTarget)}
                      onClick={(e) => pickVariant(i, e.currentTarget)}
                      style={{ background: x.body }}
                      aria-label={x.name}
                      data-cursor="tap"
                    />
                  ))}
                </div>
              </div>
              <div className={styles.info}>
                <h3 className={styles.pname}>Forest hoodie</h3>
                <p className={styles.price}>₹1,499</p>
                <p className="t-small c-muted">{v.name}. Heavyweight cotton. Cash on delivery available.</p>
                <div className={styles.sizes} role="group" aria-label="Size">
                  {SIZES.map((s) => (
                    <button key={s} type="button" className={styles.size} data-size={s} aria-pressed={size === s} onClick={(e) => pickSize(s, e.currentTarget)} data-cursor="tap">
                      {s}
                    </button>
                  ))}
                </div>
                <button type="button" className={`${styles.chartLink} t-small`} data-chart onClick={(e) => openChart(e.currentTarget)}>
                  Size chart
                </button>
                <button type="button" className={styles.add} data-add onClick={(e) => add(e.currentTarget)} data-cursor="tap">
                  {size ? `Add to cart, size ${size}` : "Choose a size"}
                </button>
              </div>
            </div>
            <div className={styles.reviews}>
              <button type="button" className={styles.reviewsBtn} onClick={(e) => openReviews(e.currentTarget)} aria-expanded={reviews}>
                Reviews, 3
              </button>
              {reviews ? (
                <ul className={styles.reviewLines} aria-label="Reviews (demo placeholders)">
                  {[78, 64, 86].map((w, i) => (
                    <li key={i}>
                      <span className={styles.stars} aria-hidden>
                        ★★★★★
                      </span>
                      <span className={styles.bar} style={{ width: `${w}%` }} />
                      <span className={styles.bar} style={{ width: `${w - 30}%` }} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className={styles.more} aria-hidden>
              <p className="t-hud c-muted">You may also like</p>
              <div className={styles.cards}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={styles.card} />
                ))}
              </div>
            </div>
          </div>
          {chart ? (
            <div className={styles.sheet} role="dialog" aria-label="Size chart">
              <div className={styles.sheetHead}>
                <b>Size chart</b>
                <button type="button" className="t-small" onClick={() => setChart(false)}>
                  Close
                </button>
              </div>
              <table className={styles.chart}>
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Chest, cm</th>
                    <th>Length, cm</th>
                  </tr>
                </thead>
                <tbody>
                  {CHART.map((r) => (
                    <tr key={r[0]}>
                      {r.map((c) => (
                        <td key={c}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {drawer ? (
            <div className={styles.drawer} role="dialog" aria-label="Cart">
              <div className={styles.sheetHead}>
                <b>Cart</b>
                <button type="button" className="t-small" onClick={() => setDrawer(false)}>
                  Close
                </button>
              </div>
              <p className="t-small">
                Forest hoodie{size ? `, ${size}` : ""} <span className="t-fig">₹1,499</span>
              </p>
              <button type="button" className={styles.add} onClick={(e) => checkout(e.currentTarget)}>
                Checkout
              </button>
            </div>
          ) : null}
          <span ref={ghost} className={styles.ghost} aria-hidden />
        </div>

        <div className={styles.side}>
          <h2 className={styles.title}>The store already knows. It just doesn’t listen.</h2>
          <p className={styles.lede}>
            Use the store. A small script records what you do, and the store’s own webhooks add payments and orders from Shopify and the
            gateway, which never miss an event the way a browser can.
          </p>
          <div className={styles.meters}>
            <div>
              <span className="t-hud c-muted">Engaged</span>
              <span className={`${styles.meter} t-fig`} data-on={engaged >= 30 ? "1" : undefined}>
                {mm}:{ss}
              </span>
            </div>
            <div>
              <span className="t-hud c-muted">Events</span>
              <span className={`${styles.meter} t-fig`}>{String(events.length ? events.at(-1)!.id : 0).padStart(3, "0")}</span>
            </div>
            <div>
              <span className="t-hud c-muted">Visitor</span>
              <span className={`${styles.meter} t-fig`}>{anon}</span>
            </div>
          </div>
          <ol ref={log} className={styles.log} aria-label="Events recorded" aria-live="polite">
            {events.length === 0 ? <li className={styles.empty}>Waiting for the first event</li> : null}
            {events.map((e) => (
              <li key={e.id} data-ev={e.id} className={styles.row} data-demo={e.demo ? "1" : undefined}>
                <span className={`${styles.t} t-num`}>{e.t.toFixed(1).padStart(5, "0")}s</span>
                <code className={styles.name}>{e.name}</code>
                <code className={styles.payload}>{e.payload}</code>
                <span className={`${styles.src} t-hud`}>{e.demo ? "demo" : e.src}</span>
              </li>
            ))}
          </ol>
          <p className={`${styles.note} t-small`}>A demo store, fictional products. Engaged time counts only on a visible tab with real activity, as the script does.</p>
        </div>
      </div>
    </section>
  );
}
