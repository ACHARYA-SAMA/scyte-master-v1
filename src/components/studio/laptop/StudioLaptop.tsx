"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { LaptopShell, type DockItem, type LaptopHandle } from "@/components/kit/LaptopShell";
import { RotaryKnob } from "@/components/kit/RotaryKnob";
import { ToggleSwitch } from "@/components/kit/ToggleSwitch";
import { HoldToConfirm } from "@/components/kit/HoldToConfirm";
import { gsap, prefersReducedMotion, ScrollTrigger } from "@/lib/motion";
import { useIdleDemo } from "@/lib/useIdleDemo";
import { sfx } from "@/lib/sound";
import { Garment, type GarmentKind } from "./Garment";
import styles from "./laptop.module.css";

const THEMES = [
  { id: "cream", label: "Cream", bg: "#e6d5b8", ink: "#1b261d", soft: "#334638", card: "#d8c9ab", accent: "#2b3a2f", on: "#e6d5b8" },
  { id: "ground", label: "Green", bg: "#1b261d", ink: "#e6d5b8", soft: "#cfc7aa", card: "#253026", accent: "#c2b897", on: "#1b261d" },
  { id: "khaki", label: "Khaki", bg: "#c2b897", ink: "#1b261d", soft: "#253026", card: "#cfc7aa", accent: "#1b261d", on: "#e6d5b8" },
] as const;
type ThemeId = (typeof THEMES)[number]["id"];
type WinId = "design" | "code" | "deploy" | "analytics";

const PRODUCTS: [string, string, GarmentKind][] = [
  ["Hoodie, oat", "₹1,499", "hoodie"],
  ["Tee, moss", "₹799", "tee"],
  ["Crew, cream", "₹1,199", "crew"],
  ["Cargo, olive", "₹1,899", "cargo"],
  ["Cap, sand", "₹599", "cap"],
  ["Socks, three", "₹449", "socks"],
];
/** each garment's cloth, from inside the palette */
const CLOTH = ["#c2b897", "#5d8c62", "#e6d5b8", "#6f7a4a", "#cfc7aa", "#af9034"];

/* ------------------------------------------------------------------ the page inside */
function Store({ cart, onAdd, grid }: { cart: number; onAdd: () => void; grid: boolean }) {
  const [size, setSize] = useState("M");
  return (
    <div className={styles.store} data-grid={grid ? "1" : undefined}>
      <header className={styles.sHead}>
        <b className={styles.sLogo}>Demo store</b>
        <nav>
          <span>Shop</span>
          <span>New</span>
          <span>About</span>
        </nav>
        <span className={styles.sCart} data-n={cart}>
          Cart ({cart})
        </span>
      </header>
      <section className={styles.sHero}>
        <div className={styles.sHeroCopy}>
          <p className={styles.sKicker}>Autumn drop, sample</p>
          <h4 className={styles.sTitle}>
            <span className={styles.sMask}>
              <span data-rise>Heavyweight</span>
            </span>
            <span className={styles.sMask}>
              <span data-rise>basics.</span>
            </span>
          </h4>
          <p className={styles.sLede}>Cut in Tiruppur, finished by hand. A fictional store, built the way we build real ones.</p>
          <span className={styles.sCta}>Shop the drop</span>
        </div>
        <div className={styles.sArt} aria-hidden>
          <span className={styles.sArtBack}>
            <Garment kind="tee" body="#5d8c62" trim="rgb(27 38 29 / 0.5)" className={styles.sGarment} />
          </span>
          <span className={styles.sArtFront}>
            <Garment kind="hoodie" body="#c2b897" trim="rgb(27 38 29 / 0.6)" className={styles.sGarment} />
          </span>
        </div>
      </section>
      <div className={styles.sBelt} aria-hidden>
        <span>Free shipping over ₹999</span>
        <span>Cash on delivery</span>
        <span>Seven-day returns</span>
        <span>Free shipping over ₹999</span>
        <span>Cash on delivery</span>
        <span>Seven-day returns</span>
      </div>
      <section className={styles.sGrid}>
        <h5 className={styles.sH}>New this week</h5>
        <div className={styles.sCards}>
          {PRODUCTS.map(([n, p, kind], i) => (
            <div key={n} className={styles.sCard} data-reveal style={{ "--i": i } as CSSProperties}>
              <span className={styles.sImg} data-tone={i % 3}>
                <Garment kind={kind} body={CLOTH[i]!} trim="rgb(27 38 29 / 0.55)" className={styles.sGarment} />
              </span>
              <p>
                {n} <b>{p}</b>
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className={styles.sProduct}>
        <div className={styles.sGallery} aria-hidden>
          <span data-tone="0">
            <Garment kind="hoodie" body="#c2b897" trim="rgb(27 38 29 / 0.6)" className={styles.sGarment} />
          </span>
          <span data-tone="1">
            <Garment kind="hoodie" body="#5d8c62" trim="rgb(27 38 29 / 0.6)" className={styles.sGarment} />
          </span>
          <span data-tone="2">
            <Garment kind="hoodie" body="#e6d5b8" trim="rgb(27 38 29 / 0.6)" className={styles.sGarment} />
          </span>
        </div>
        <div className={styles.sBuy}>
          <p className={styles.sKicker}>Product page</p>
          <h5 className={styles.sName}>Heavyweight hoodie</h5>
          <p className={styles.sPrice}>₹1,499</p>
          <div className={styles.sSizes}>
            {["S", "M", "L", "XL"].map((s) => (
              <button key={s} type="button" data-on={size === s ? "1" : undefined} onClick={() => setSize(s)} tabIndex={-1}>
                {s}
              </button>
            ))}
          </div>
          <button type="button" className={styles.sAdd} onClick={onAdd} tabIndex={-1}>
            Add size {size} to cart
          </button>
          <p className={styles.sNote}>Size chart. Reviews. Cash on delivery. All demo.</p>
        </div>
      </section>
      <footer className={styles.sFoot}>Demo store, made by Scyte to show the craft. Not client work.</footer>
      {grid ? (
        <div className={styles.sOverlay} aria-hidden>
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ windows */
function Win({
  id,
  title,
  pos,
  z,
  open,
  onFocus,
  onMove,
  onClose,
  children,
  wide,
}: {
  id: WinId;
  title: string;
  pos: { x: number; y: number };
  z: number;
  open: boolean;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  // dragged by its title bar; the screen is scaled, so pointer pixels are converted to the page's own
  const drag = (e: RPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const node = el.current;
    const vp = node?.parentElement;
    if (!node || !vp) return;
    e.preventDefault();
    onFocus();
    const scale = vp.getBoundingClientRect().width / vp.offsetWidth || 1;
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = pos.x;
    const oy = pos.y;
    const move = (ev: PointerEvent) => onMove(Math.max(-200, Math.min(1180, ox + (ev.clientX - sx) / scale)), Math.max(26, Math.min(740, oy + (ev.clientY - sy) / scale)));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div
      ref={el}
      className={styles.win}
      data-id={id}
      data-open={open ? "1" : "0"}
      data-wide={wide ? "1" : undefined}
      style={{ left: pos.x, top: pos.y, zIndex: z } as CSSProperties}
      onPointerDown={onFocus}
      role="dialog"
      aria-label={title}
      aria-hidden={!open}
      inert={!open}
    >
      <div className={styles.bar} onPointerDown={drag} data-cursor="drag">
        <span className={styles.lights} aria-hidden>
          <button type="button" onClick={onClose} aria-label={`Close ${title}`} tabIndex={-1} />
          <i />
          <i />
        </span>
        <span className={styles.winTitle}>{title}</span>
      </div>
      <div className={styles.winBody}>{children}</div>
    </div>
  );
}

const glyph = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/**
 * S3, the Laptop: a standard 16:10 laptop running a real storefront and four app
 * windows. The outer scroll scrolls the store while the section is pinned; point at
 * the screen to scroll it yourself. The Design window's knobs and grid switch change
 * the store live, the Code window shows the CSS they write, Deploy runs a labelled
 * simulation, and every window drags by its title bar. The keys go down as you type.
 */
export function StudioLaptop() {
  const section = useRef<HTMLElement>(null);
  const laptop = useRef<LaptopHandle>(null);
  const area = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [weight, setWeight] = useState(860);
  const [width, setWidth] = useState(66);
  const [speed, setSpeed] = useState(100);
  const [grid, setGrid] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("cream");
  const [cart, setCart] = useState(0);
  const [run, setRun] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [open, setOpen] = useState<Record<WinId, boolean>>({ design: true, code: true, deploy: false, analytics: false });
  const [pos, setPos] = useState<Record<WinId, { x: number; y: number }>>({
    design: { x: 900, y: 44 },
    code: { x: 880, y: 470 },
    deploy: { x: 520, y: 380 },
    analytics: { x: 60, y: 470 },
  });
  const [order, setOrder] = useState<WinId[]>(["analytics", "deploy", "code", "design"]);
  const [changed, setChanged] = useState<string | null>(null);

  const focus = (id: WinId) => setOrder((o) => (o[o.length - 1] === id ? o : [...o.filter((x) => x !== id), id]));
  const toggle = (id: WinId) => {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
    focus(id);
    sfx.blip();
  };

  // pin: the lid opens as the section arrives, then the store scrolls with the page
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const lid = ScrollTrigger.create({ trigger: el, start: "top 90%", end: "top 10%", scrub: true, onUpdate: (s) => laptop.current?.lid(s.progress), onRefresh: (s) => laptop.current?.lid(s.progress) });
    const pin = ScrollTrigger.create({ trigger: el, start: "top top", end: "bottom bottom", onUpdate: (s) => laptop.current?.scrub(Math.min(1, Math.max(0, (s.progress - 0.04) / 0.9))) });
    return () => {
      lid.kill();
      pin.kill();
    };
  }, []);

  // the store's own motion: the title rises, the cards reveal inside the screen's scroll
  useEffect(() => {
    const el = inner.current;
    if (!el || prefersReducedMotion()) return;
    const k = 100 / speed;
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-rise]", { yPercent: 110 }, { yPercent: 0, duration: 0.8 * k, ease: "glide", stagger: 0.08 * k });
    }, el);
    return () => ctx.revert();
  }, [speed, run]);
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && ((e.target as HTMLElement).dataset.in = "1")), { threshold: 0.2 });
    el.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  // a change flashes in the Code window
  const set = <T,>(key: string, fn: (v: T) => void) => (v: T) => {
    fn(v);
    setChanged(key);
  };
  useEffect(() => {
    if (!changed) return;
    const t = window.setTimeout(() => setChanged(null), 700);
    return () => window.clearTimeout(t);
  }, [changed]);

  // the bench works itself until someone takes over
  useIdleDemo(
    area,
    (n) => {
      const steps: (() => void)[] = [
        () => set("weight", setWeight)(520),
        () => set("width", setWidth)(110),
        () => set("theme", setTheme)("ground"),
        () => set("grid", setGrid)(true),
        () => {
          set("weight", setWeight)(900);
          setWidth(62);
        },
        () => set("grid", setGrid)(false),
        () => set("theme", setTheme)("khaki"),
        () => setRun((r) => r + 1),
        () => {
          setTheme("cream");
          setWeight(860);
          setWidth(66);
        },
      ];
      steps[n % steps.length]!();
    },
    2400,
  );

  const deploy = () => {
    const lines = ["Build: compiling 42 routes", "Build: done in 38 s", "Check: no console errors, no layout shift", "Upload: 2.1 MB to the edge", "Live: demo-store.example"];
    setLog([]);
    lines.forEach((l, i) => window.setTimeout(() => setLog((x) => [...x, l]), (i + 1) * 420));
    sfx.relay();
  };

  const t = THEMES.find((x) => x.id === theme)!;
  const vars = { "--m-bg": t.bg, "--m-ink": t.ink, "--m-soft": t.soft, "--m-card": t.card, "--m-accent": t.accent, "--m-on": t.on, "--m-weight": weight, "--m-width": `${width}%`, "--m-speed": speed / 100 } as CSSProperties;

  const dock: DockItem[] = [
    { id: "design", label: "Design", on: open.design, onClick: () => toggle("design"), glyph: glyph("M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-1-.8-1.4-.8-2.3 0-1 .8-1.6 1.7-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3ZM7.5 11.5h.01M10 7.5h.01M15 7.5h.01") },
    { id: "code", label: "Code", on: open.code, onClick: () => toggle("code"), glyph: glyph("m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14") },
    { id: "deploy", label: "Deploy", on: open.deploy, onClick: () => toggle("deploy"), glyph: glyph("M12 3v12m0-12-4 4m4-4 4 4M5 15v4h14v-4") },
    { id: "analytics", label: "Analytics", on: open.analytics, onClick: () => toggle("analytics"), glyph: glyph("M4 19V5M4 19h16M8 15l3-4 3 2 5-6") },
  ];

  const zOf = (id: WinId) => 10 + order.indexOf(id);
  const win = (id: WinId) => ({ id, pos: pos[id], z: zOf(id), open: open[id], onFocus: () => focus(id), onMove: (x: number, y: number) => setPos((p) => ({ ...p, [id]: { x, y } })), onClose: () => toggle(id) });

  const overlay = (
    <>
      <Win title="Design" {...win("design")}>
        <div className={styles.knobs}>
          <RotaryKnob label="Weight" value={weight} min={300} max={900} step={20} onChange={set("weight", setWeight)} size="s" />
          <RotaryKnob label="Width" value={width} min={62} max={125} step={1} onChange={set("width", setWidth)} format={(v) => `${v} %`} size="s" />
          <RotaryKnob label="Motion" value={speed} min={40} max={200} step={10} onChange={set("speed", setSpeed)} format={(v) => `${v} %`} size="s" />
        </div>
        <div className={styles.row}>
          <ToggleSwitch label="Grid" checked={grid} onChange={set("grid", setGrid)} offLabel="Off" onLabel="On" />
          <div className={styles.swatches} role="radiogroup" aria-label="Theme">
            {THEMES.map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={theme === x.id} onClick={() => set("theme", setTheme)(x.id)} aria-label={x.label} style={{ background: x.bg, boxShadow: `inset 0 -8px 0 ${x.accent}` }} data-cursor="tap" />
            ))}
          </div>
        </div>
        <button type="button" className={styles.winBtn} onClick={() => setRun((r) => r + 1)}>
          Replay the entrance
        </button>
      </Win>
      <Win title="Code" {...win("code")} wide>
        <pre className={styles.code}>
          <code>
            <span className={styles.c}>{"/* written by the Design window */"}</span>
            {"\n"}
            <span className={styles.k}>.hero h1</span> {"{"}
            {"\n  "}
            <span className={styles.p}>font-weight</span>: <span className={styles.v} data-flash={changed === "weight" ? "1" : undefined}>{weight}</span>;{"\n  "}
            <span className={styles.p}>font-stretch</span>: <span className={styles.v} data-flash={changed === "width" ? "1" : undefined}>{width}%</span>;{"\n"}
            {"}"}
            {"\n"}
            <span className={styles.k}>:root</span> {"{"}
            {"\n  "}
            <span className={styles.p}>--motion</span>: <span className={styles.v} data-flash={changed === "speed" ? "1" : undefined}>{(speed / 100).toFixed(1)}</span>;{"\n  "}
            <span className={styles.p}>--bg</span>: <span className={styles.v} data-flash={changed === "theme" ? "1" : undefined}>{t.bg}</span>;{"\n  "}
            <span className={styles.p}>--grid</span>: <span className={styles.v} data-flash={changed === "grid" ? "1" : undefined}>{grid ? "visible" : "hidden"}</span>;{"\n"}
            {"}"}
          </code>
        </pre>
      </Win>
      <Win title="Deploy" {...win("deploy")}>
        <p className={styles.sim}>Simulation</p>
        <HoldToConfirm onConfirm={deploy} doneLabel="Deployed">
          Hold to deploy
        </HoldToConfirm>
        <ol className={styles.log}>
          {log.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ol>
      </Win>
      <Win title="Analytics" {...win("analytics")}>
        <p className={styles.sim}>Sample data</p>
        <svg viewBox="0 0 240 70" className={styles.spark} aria-label="Sample visits over 14 days">
          <polyline points="0,58 20,52 40,54 60,44 80,46 100,38 120,40 140,30 160,34 180,22 200,26 220,16 240,18" />
        </svg>
        <p className={styles.small}>Visits, last 14 days. Cart adds this session: {cart}.</p>
      </Win>
    </>
  );

  return (
    <section ref={section} className={styles.section} id="website" aria-labelledby="laptop-title" data-avoid-pill>
      <div className={styles.sticky}>
        <div className={styles.copy}>
          <p className={`${styles.kicker} t-hud`}>01 Websites</p>
          <h3 id="laptop-title" className={styles.title}>
            A real page, on a real screen. Turn it.
          </h3>
          <p className={styles.lede}>
            The Design window&rsquo;s knobs set the type and the motion of the store behind it; the Code window writes the CSS as you turn. Drag
            the windows. Scroll, or point at the screen and scroll the store yourself.
          </p>
          <p className={`${styles.note} t-small`}>A demo store, not client work.</p>
        </div>
        <div ref={area} className={styles.stage}>
          <LaptopShell
            ref={laptop}
            label="A laptop running the demo store"
            app="Browser"
            menu={["File", "Edit", "View", "History", "Window"]}
            dock={dock}
            overlay={overlay}
            onInnerScroll={(y) => inner.current?.style.setProperty("--sy", String(Math.round(y)))}
          >
            <div ref={inner} className={styles.inner} style={vars}>
              <Store cart={cart} onAdd={() => setCart((c) => c + 1)} grid={grid} />
            </div>
          </LaptopShell>
        </div>
      </div>
    </section>
  );
}
