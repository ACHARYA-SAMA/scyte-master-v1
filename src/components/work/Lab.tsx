"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { RotaryKnob } from "@/components/kit/RotaryKnob";
import { ToggleSwitch } from "@/components/kit/ToggleSwitch";
import { LOGO_CAP_HEIGHT, LOGO_OVERSHOOT, LOGO_PATH, LOGO_VIEWBOX, LOGO_WIDTH } from "@/lib/logo/geometry";
import { prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { toggleSound } from "@/lib/prefs";
import { ui, useStore } from "@/lib/store";
import styles from "./Lab.module.css";

function Bench({ n, title, line, children, controls }: { n: string; title: string; line: string; children: ReactNode; controls: ReactNode }) {
  return (
    <article className={styles.bench}>
      <header className={styles.benchHead}>
        <span className={`${styles.n} t-hud`}>Experiment {n}</span>
        <h3 className={styles.benchTitle}>{title}</h3>
        <p className={styles.benchLine}>{line}</p>
      </header>
      <div className={styles.toy} data-avoid>
        {children}
      </div>
      <div className={styles.controls} data-avoid>
        {controls}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ 01, retry before they leave */
function Retry() {
  const [phase, setPhase] = useState<"idle" | "armed" | "failed" | "done" | "early">("idle");
  const [ms, setMs] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [reason, setReason] = useState(true);
  const t0 = useRef(0);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const start = () => {
    setPhase("armed");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      t0.current = performance.now();
      setPhase("failed");
      sfx.deny();
    }, 1200 + Math.random() * 2600);
  };
  const press = () => {
    if (phase === "idle" || phase === "done" || phase === "early") return start();
    if (phase === "armed") {
      window.clearTimeout(timer.current);
      setPhase("early");
      return;
    }
    const d = Math.round(performance.now() - t0.current);
    setMs(d);
    setBest((b) => (b === null ? d : Math.min(b, d)));
    setPhase("done");
    sfx.ok();
  };
  return (
    <Bench
      n="01"
      title="Retry before they leave"
      line="A payment fails at a random moment. Send the retry the instant it does. A game, not a measurement."
      controls={
        <>
          <ToggleSwitch label="Reason code" checked={reason} onChange={setReason} offLabel="Hide" onLabel="Show" />
          <p className={`${styles.read} t-hud`}>Best {best === null ? "none yet" : `${best} ms`}</p>
        </>
      }
    >
      <button type="button" className={styles.retry} data-phase={phase} onClick={press} data-cursor="tap">
        <span className={styles.retryScreen}>
          {phase === "idle" ? "Press to start a checkout" : null}
          {phase === "armed" ? "Paying ₹1,499 by UPI…" : null}
          {phase === "failed" ? (reason ? "Payment failed: UPI_TIMEOUT. Retry now." : "Payment failed. Retry now.") : null}
          {phase === "done" ? `Retry sent in ${ms} ms. Press to go again.` : null}
          {phase === "early" ? "Too early: it had not failed yet. Press to try again." : null}
        </span>
      </button>
    </Bench>
  );
}

/* ------------------------------------------------------------------ 02, recover the carts */
function Carts() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [traffic, setTraffic] = useState(3);
  const [score, setScore] = useState({ saved: 0, lost: 0 });
  const [running, setRunning] = useState(false);
  const game = useRef({ carts: [] as { x: number; y: number; v: number; dead: boolean }[], last: 0, spawn: 0, until: 0 });
  const trafficRef = useRef(traffic);
  useEffect(() => {
    trafficRef.current = traffic;
  });

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    let raf = 0;
    const font = getComputedStyle(c).fontFamily;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== Math.round(w * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = game.current;
      const dt = Math.min(0.05, (now - (g.last || now)) / 1000);
      g.last = now;
      ctx.clearRect(0, 0, w, h);
      // the checkout line the carts fall past
      ctx.strokeStyle = "#334638";
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, h - 18);
      ctx.lineTo(w, h - 18);
      ctx.stroke();
      ctx.setLineDash([]);
      const live = now < g.until;
      if (live) {
        g.spawn -= dt;
        if (g.spawn <= 0) {
          g.carts.push({ x: 16 + Math.random() * (w - 32), y: -12, v: 50 + trafficRef.current * 22 + Math.random() * 30, dead: false });
          g.spawn = 1.1 - trafficRef.current * 0.15;
        }
      }
      for (const k of g.carts) {
        if (k.dead) continue;
        k.y += k.v * dt;
        if (k.y > h - 18) {
          k.dead = true;
          setScore((s) => ({ ...s, lost: s.lost + 1 }));
          continue;
        }
        ctx.fillStyle = "#f9dc7d";
        ctx.fillRect(k.x - 9, k.y - 7, 18, 12);
        ctx.fillStyle = "#1b261d";
        ctx.fillRect(k.x - 6, k.y + 6, 4, 4);
        ctx.fillRect(k.x + 2, k.y + 6, 4, 4);
      }
      g.carts = g.carts.filter((k) => !k.dead || k.y < h);
      if (!live && g.until && g.carts.every((k) => k.dead)) {
        g.until = 0;
        setRunning(false);
      }
      // nobody playing: three ghost carts bob above the line, and the way in
      if (!g.until && !g.carts.length) {
        const t = now / 1000;
        ctx.globalAlpha = 0.28;
        for (let i = 0; i < 3; i++) {
          const x = w * (0.3 + i * 0.2);
          const y = h * 0.42 + Math.sin(t * 1.4 + i * 1.9) * 10;
          ctx.fillStyle = "#f9dc7d";
          ctx.fillRect(x - 9, y - 7, 18, 12);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#c2b897";
        ctx.font = `600 14px ${font}`;
        ctx.textAlign = "center";
        ctx.fillText("Press Start, then tap the carts", w / 2, h * 0.7);
      }
    };
    // only while the bench is on screen
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e?.isIntersecting) raf = requestAnimationFrame(draw);
    });
    io.observe(c);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const hit = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const g = game.current;
    const k = g.carts.find((c) => !c.dead && Math.abs(c.x - x) < 18 && Math.abs(c.y - y) < 16);
    if (k) {
      k.dead = true;
      k.y = Infinity;
      setScore((s) => ({ ...s, saved: s.saved + 1 }));
      sfx.clink();
    }
  };
  const start = () => {
    game.current.carts = [];
    game.current.until = performance.now() + 20000;
    game.current.spawn = 0;
    setScore({ saved: 0, lost: 0 });
    setRunning(true);
  };
  return (
    <Bench
      n="02"
      title="Recover the carts"
      line="Twenty seconds of abandoned carts. Tap them before they pass the line."
      controls={
        <>
          <RotaryKnob label="Traffic" value={traffic} min={1} max={5} step={1} onChange={setTraffic} size="s" />
          <button type="button" className={styles.btn} onClick={start} disabled={running}>
            {running ? "Running" : "Start"}
          </button>
          <p className={`${styles.read} t-hud`} aria-live="polite">
            Saved {score.saved}, lost {score.lost}
          </p>
        </>
      }
    >
      <canvas ref={canvas} className={styles.canvas} onPointerDown={hit} aria-label="Carts falling; tap to recover them" data-cursor="tap" />
    </Bench>
  );
}

/* ------------------------------------------------------------------ 03, the type specimen */
function Specimen() {
  const id = useId();
  const [text, setText] = useState("Heavyweight basics");
  const [wght, setWght] = useState(820);
  const [wdth, setWdth] = useState(72);
  const [axes, setAxes] = useState<{ wght: boolean; wdth: boolean } | null>(null);
  // proof the axes are really loaded: measure the same word at both ends of each axis
  useEffect(() => {
    void document.fonts.ready.then(() => {
      const s = document.createElement("span");
      s.style.cssText = "position:absolute;visibility:hidden;font-family:var(--font);font-size:60px;white-space:nowrap";
      s.textContent = "Archivo";
      document.body.appendChild(s);
      const m = (w: number, st: number) => {
        s.style.fontWeight = String(w);
        s.style.fontStretch = `${st}%`;
        return s.getBoundingClientRect().width;
      };
      const weight = Math.abs(m(200, 100) - m(900, 100)) > 2;
      const width = Math.abs(m(500, 62) - m(500, 125)) > 2;
      s.remove();
      setAxes({ wght: weight, wdth: width });
    });
  }, []);
  return (
    <Bench
      n="03"
      title="Archivo, two axes"
      line="The one typeface on this site, at any weight and width between its masters."
      controls={
        <>
          <RotaryKnob label="Weight" value={wght} min={100} max={900} step={20} onChange={setWght} size="s" />
          <RotaryKnob label="Width" value={wdth} min={62} max={125} step={1} onChange={setWdth} format={(v) => `${v} %`} size="s" />
          <p className={`${styles.read} t-hud`}>{axes ? `Weight axis ${axes.wght ? "live" : "static"}, width axis ${axes.wdth ? "live" : "static"}` : "Checking the axes"}</p>
        </>
      }
    >
      <label htmlFor={id} className="sr-only">
        Specimen text
      </label>
      <input id={id} className={styles.specimen} value={text} onChange={(e) => setText(e.target.value)} style={{ fontWeight: wght, fontStretch: `${wdth}%` } as CSSProperties} spellCheck={false} />
    </Bench>
  );
}

/* ------------------------------------------------------------------ 04, the palette and its contrast */
const TOKENS = [
  { id: "ground", hex: "#1b261d" },
  { id: "surface", hex: "#253026" },
  { id: "line", hex: "#334638" },
  { id: "khaki", hex: "#c2b897" },
  { id: "cream", hex: "#e6d5b8" },
  { id: "lumen", hex: "#f9dc7d" },
];
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
};
function Palette() {
  const [fg, setFg] = useState(4);
  const [bg, setBg] = useState(0);
  const [large, setLarge] = useState(false);
  const r = ratio(TOKENS[fg]!.hex, TOKENS[bg]!.hex);
  const need = large ? 3 : 4.5;
  return (
    <Bench
      n="04"
      title="The palette, checked"
      line="Any two of the site's colours, with their real WCAG contrast. Dial the text and the ground."
      controls={
        <>
          <RotaryKnob label="Text" value={fg} min={0} max={TOKENS.length - 1} step={1} ticks={TOKENS.length} onChange={setFg} format={(v) => TOKENS[v]!.id} size="s" />
          <RotaryKnob label="Ground" value={bg} min={0} max={TOKENS.length - 1} step={1} ticks={TOKENS.length} onChange={setBg} format={(v) => TOKENS[v]!.id} size="s" />
          <ToggleSwitch label="Text size" checked={large} onChange={setLarge} offLabel="Body" onLabel="Large" />
        </>
      }
    >
      <div className={styles.swatch} style={{ background: TOKENS[bg]!.hex, color: TOKENS[fg]!.hex } as CSSProperties}>
        <span className={styles.swatchText} data-large={large ? "1" : undefined}>
          Fewer messages. Better timed.
        </span>
        <span className={styles.ratio}>
          {r.toFixed(2)} : 1 <b>{r >= need ? (r >= (large ? 4.5 : 7) ? "AAA" : "AA") : "Fails AA"}</b>
        </span>
      </div>
    </Bench>
  );
}

/* ------------------------------------------------------------------ 05, the sound pad */
const PADS: { label: string; play: () => void }[] = [
  { label: "Clink", play: () => sfx.clink() },
  { label: "Relay", play: () => sfx.relay() },
  { label: "Detent", play: () => sfx.detent() },
  { label: "Scan", play: () => sfx.scan() },
  { label: "Flap", play: () => sfx.flap() },
  { label: "Drip", play: () => sfx.drip() },
  { label: "Stamp", play: () => sfx.stamp() },
  { label: "Clamp", play: () => sfx.clamp() },
  { label: "Whoosh", play: () => sfx.whoosh() },
];
function Pad() {
  const on = useStore(ui, (s) => s.soundOn);
  const [hit, setHit] = useState(-1);
  const play = (i: number) => {
    PADS[i]!.play();
    setHit(i);
    window.setTimeout(() => setHit((h) => (h === i ? -1 : h)), 160);
  };
  return (
    <Bench
      n="05"
      title="The sound pad"
      line="Every sound on the site, made from a few oscillators and noise. Nothing is downloaded."
      controls={
        <>
          <ToggleSwitch label="Sound" checked={on} onChange={() => toggleSound()} offLabel="Off" onLabel="On" />
          <p className={`${styles.read} t-hud`}>{on ? "Keys 1 to 9 play too" : "Sound is off until you switch it on"}</p>
        </>
      }
    >
      <div
        className={styles.pads}
        onKeyDown={(e) => {
          const k = Number(e.key);
          if (k >= 1 && k <= 9) play(k - 1);
        }}
      >
        {PADS.map((p, i) => (
          <button key={p.label} type="button" className={styles.pad} data-hit={hit === i ? "1" : undefined} onPointerDown={() => play(i)} onKeyDown={(e) => e.key === "Enter" && play(i)} data-cursor="tap">
            <span className="t-hud">{i + 1}</span>
            {p.label}
          </button>
        ))}
      </div>
    </Bench>
  );
}

/* ------------------------------------------------------------------ 06, the logo sandbox */
const H = LOGO_CAP_HEIGHT + LOGO_OVERSHOOT;
function Sandbox() {
  const [level, setLevel] = useState(100);
  const [slice, setSlice] = useState(0);
  const [grid, setGrid] = useState(false);
  const clip = useId().replace(/:/g, "");
  const [t, setT] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion() || level >= 100) return;
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      setT(now / 1000);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [level]);
  const y0 = -LOGO_OVERSHOOT + H * (1 - level / 100);
  let wave = `M-2 ${H + 2}`;
  for (let x = -2; x <= LOGO_WIDTH + 2; x += 4) wave += `L${x} ${(y0 + (level < 100 ? Math.sin(x * 0.14 - t * 3) * 0.8 : 0)).toFixed(2)}`;
  wave += `L${LOGO_WIDTH + 2} ${H + 2}Z`;
  const strips = 5;
  return (
    <Bench
      n="06"
      title="The logo, in a sandbox"
      line="Fill it, slice it, lay the pixel grid over it. Turn the knobs back and it is the exact mark again."
      controls={
        <>
          <RotaryKnob label="Liquid" value={level} min={0} max={100} step={5} onChange={setLevel} format={(v) => `${v} %`} size="s" />
          <RotaryKnob label="Slice" value={slice} min={0} max={20} step={1} onChange={setSlice} size="s" />
          <ToggleSwitch label="Pixel grid" checked={grid} onChange={setGrid} offLabel="Off" onLabel="On" />
        </>
      }
    >
      <svg viewBox={LOGO_VIEWBOX} className={styles.logo} role="img" aria-label="The Scyte logo" data-rest={level === 100 && slice === 0 ? "1" : "0"}>
        <defs>
          <clipPath id={clip}>
            <path d={LOGO_PATH} />
          </clipPath>
          {Array.from({ length: strips }, (_, i) => (
            <clipPath key={i} id={`${clip}-s${i}`}>
              <rect x={-30} y={-LOGO_OVERSHOOT + (i * H) / strips} width={LOGO_WIDTH + 60} height={H / strips + 0.02} />
            </clipPath>
          ))}
        </defs>
        {slice === 0 ? (
          <g>
            <path d={LOGO_PATH} className={styles.logoGlass} />
            <g clipPath={`url(#${clip})`}>
              <path d={wave} className={styles.logoLiquid} />
            </g>
          </g>
        ) : (
          // sliced: five bands, alternate ones pushed left and right
          Array.from({ length: strips }, (_, i) => (
            <g key={i} clipPath={`url(#${clip}-s${i})`}>
              <g transform={`translate(${(i % 2 ? 1 : -1) * slice} 0)`}>
                <path d={LOGO_PATH} className={styles.logoGlass} />
                <g clipPath={`url(#${clip})`}>
                  <path d={wave} className={styles.logoLiquid} />
                </g>
              </g>
            </g>
          ))
        )}
        {grid ? (
          <g className={styles.logoGrid}>
            {Array.from({ length: Math.ceil(LOGO_WIDTH / 5) + 1 }, (_, i) => (
              <line key={`x${i}`} x1={i * 5} x2={i * 5} y1={-1} y2={H} />
            ))}
            {Array.from({ length: Math.ceil(H / 5) + 1 }, (_, i) => (
              <line key={`y${i}`} x1={0} x2={LOGO_WIDTH} y1={i * 5} y2={i * 5} />
            ))}
          </g>
        ) : null}
      </svg>
    </Bench>
  );
}

/**
 * W3, the Lab: six small things to play with, each one a piece of how this site is
 * made, each with its own knobs and switches. None of them measures anything about
 * a real store, and each says so where it might be mistaken for it.
 */
export function Lab() {
  return (
    <section id="lab" className={styles.section} aria-labelledby="lab-title">
      <header className={styles.head}>
        <p className={`${styles.kicker} t-hud`}>The lab</p>
        <h2 id="lab-title" className={styles.title}>
          Six things to play with.
        </h2>
        <p className={styles.lede}>Pieces of how this site is made, taken out of their pages and put on a bench. Turn everything.</p>
      </header>
      <div className={styles.grid}>
        <Retry />
        <Carts />
        <Specimen />
        <Palette />
        <Pad />
        <Sandbox />
      </div>
    </section>
  );
}
