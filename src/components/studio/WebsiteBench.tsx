"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { DeviceFrame } from "@/components/devices/DeviceFrame";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { useIdleDemo } from "@/lib/useIdleDemo";
import styles from "./bench.module.css";

const THEMES = [
  { id: "ground", label: "Green", vars: { "--m-bg": "#1b261d", "--m-ink": "#e6d5b8", "--m-soft": "#cfc7aa", "--m-card": "#253026", "--m-accent": "#c2b897", "--m-on": "#1b261d" } },
  { id: "khaki", label: "Khaki", vars: { "--m-bg": "#c2b897", "--m-ink": "#1b261d", "--m-soft": "#253026", "--m-card": "#cfc7aa", "--m-accent": "#1b261d", "--m-on": "#e6d5b8" } },
  { id: "cream", label: "Cream", vars: { "--m-bg": "#e6d5b8", "--m-ink": "#1b261d", "--m-soft": "#334638", "--m-card": "#cfc7aa", "--m-accent": "#2b3a2f", "--m-on": "#e6d5b8" } },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

function Range({ label, min, max, step, value, onChange, unit }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; unit: string }) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        <span>{label}</span>
        <output htmlFor={id} className="t-fig">
          {value}
          {unit}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--p": `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
        data-cursor="drag"
      />
    </div>
  );
}

/**
 * Website workbench: an inspector whose controls drive a live mini-site. Type uses the
 * same variable axes this page is set in; colour stays inside the palette.
 */
export function WebsiteBench() {
  const [weight, setWeight] = useState(860);
  const [width, setWidth] = useState(66);
  const [scale, setScale] = useState(100);
  const [theme, setTheme] = useState<ThemeId>("cream");
  const [speed, setSpeed] = useState(100);
  const [run, setRun] = useState(0);
  const site = useRef<HTMLDivElement>(null);
  const bench = useRef<HTMLDivElement>(null);

  // the inspector works itself, one control at a time, until someone takes over
  useIdleDemo(
    bench,
    (n) => {
      const DEMO: (() => void)[] = [
        () => setWeight(520),
        () => setWidth(104),
        () => setTheme("ground"),
        () => setScale(114),
        () => {
          setWeight(900);
          setWidth(62);
        },
        () => setTheme("khaki"),
        () => setRun((r) => r + 1),
        () => {
          setTheme("cream");
          setScale(100);
          setWeight(860);
          setWidth(66);
        },
      ];
      DEMO[n % DEMO.length]();
    },
    2300,
  );

  // replay the entrance whenever the motion settings change, or on request
  useEffect(() => {
    const el = site.current;
    if (!el || prefersReducedMotion()) return;
    const k = 100 / speed;
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-m-rise]", { yPercent: 110 }, { yPercent: 0, duration: 0.72 * k, ease: "glide", stagger: 0.06 * k });
      gsap.fromTo("[data-m-card]", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 * k, ease: "glide", stagger: 0.06 * k, delay: 0.2 * k });
    }, el);
    return () => ctx.revert();
  }, [speed, run]);

  const vars: Record<string, string | number> = { ...THEMES.find((t) => t.id === theme)!.vars, "--m-weight": weight, "--m-width": `${width}%`, "--m-scale": scale / 100 };

  return (
    <div ref={bench} className={styles.bench} id="website">
      <div className={styles.inspector} role="group" aria-label="Website inspector">
        <p className={`${styles.panelHead} t-hud`}>Inspector</p>
        <fieldset className={styles.group}>
          <legend className="t-hud">Type</legend>
          <Range label="Headline weight" min={300} max={900} step={10} value={weight} onChange={setWeight} unit="" />
          <Range label="Headline width" min={62} max={125} step={1} value={width} onChange={setWidth} unit="%" />
          <Range label="Scale" min={80} max={125} step={1} value={scale} onChange={setScale} unit="%" />
        </fieldset>
        <fieldset className={styles.group}>
          <legend className="t-hud">Colour</legend>
          <div className={styles.swatches} role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} className={styles.swatch} onClick={() => setTheme(t.id)} data-cursor="tap">
                <span style={{ background: t.vars["--m-bg"], boxShadow: `inset 0 -10px 0 ${t.vars["--m-accent"]}` }} aria-hidden />
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.group}>
          <legend className="t-hud">Motion</legend>
          <Range label="Speed" min={40} max={200} step={5} value={speed} onChange={setSpeed} unit="%" />
          <button type="button" className={styles.ghost} onClick={() => setRun((r) => r + 1)}>
            Replay the entrance
          </button>
        </fieldset>
      </div>
      <div className={styles.screen}>
        <DeviceFrame kind="laptop" label="Live mini-site">
          <div ref={site} className={styles.mini} style={vars as CSSProperties}>
            <nav className={styles.mNav}>
              <b>Demo store</b>
              <span>Shop</span>
              <span>New</span>
              <span>About</span>
              <span>Cart (0)</span>
            </nav>
            <div className={styles.mHero}>
              <div className={styles.mImage} aria-hidden>
                <span />
              </div>
              <div className={styles.mCopy}>
                <h3 className={styles.mTitle}>
                  <span className={styles.mMask}>
                    <span data-m-rise>Heavyweight</span>
                  </span>
                  <span className={styles.mMask}>
                    <span data-m-rise>basics.</span>
                  </span>
                </h3>
                <span className={styles.mCta}>Shop the drop</span>
              </div>
            </div>
            <div className={styles.mCards}>
              {[
                ["Hoodie, oat", "₹1,499"],
                ["Tee, moss", "₹799"],
                ["Crew, cream", "₹1,199"],
              ].map(([n, p]) => (
                <div key={n} className={styles.mCard} data-m-card>
                  <span aria-hidden />
                  <p>
                    {n} <b>{p}</b>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </DeviceFrame>
        <p className="t-small c-muted">A demo store, not client work. Every control here is a real CSS variable on a real page.</p>
      </div>
    </div>
  );
}
