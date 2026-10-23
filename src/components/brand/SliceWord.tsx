"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { LOGO_CAP_HEIGHT, LOGO_OVERSHOOT, LOGO_PATH, LOGO_VIEWBOX, LOGO_WIDTH, LOGO_STROKE } from "@/lib/logo/geometry";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./SliceWord.module.css";

/** One strip per logo stroke: 140 / 5 = 28 strips. */
export const STRIPS = LOGO_WIDTH / LOGO_STROKE;

export type Face = { id: string; kind: "logo" } | { id: string; kind: "text"; text: string };

export type Tone = "khaki" | "cream" | "lumen" | "ground";

type Layer = { face: Face; tone: Tone; key: number; state: "in" | "out" };

export type StripHandle = { strips: HTMLElement[]; layer: HTMLElement };

/** Switch a layer between its unsliced resting drawing and its 28 moving strips. */
export const setSliced = (layer: HTMLElement, sliced: boolean) => {
  layer.dataset.sliced = sliced ? "1" : "0";
};

type Props = {
  face: Face;
  tone?: Tone;
  /** Strip index the stagger radiates from (e.g. under the cursor). */
  origin?: number;
  className?: string;
  style?: CSSProperties;
  /** Receives the strips of the face currently on stage, for pointer displacement. */
  onStrips?: (face: StripHandle) => void;
  /** Accessible text for the whole word. */
  label?: string;
};

// Fixed per-strip travel directions and distances: the chopped look of a mechanical
// shutter rather than a uniform wipe.
const DIR = Array.from({ length: STRIPS }, (_, i) => ((i * 7) % 5 < 2 ? -1 : 1));
const DIST = Array.from({ length: STRIPS }, (_, i) => 100 + ((i * 37) % 41));

const DEFAULT_CAP = 0.72;
const NARROW = { stretch: 62, scale: 1 };
let capRatio = DEFAULT_CAP;
let capMeasured = false;
const measureCap = () => {
  if (capMeasured || typeof document === "undefined") return capRatio;
  const c = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const family = getComputedStyle(document.body).fontFamily;
  if (!c || !family) return capRatio;
  c.font = `900 200px ${family}`;
  const m = c.measureText("H");
  if (m.actualBoundingBoxAscent > 0) {
    capRatio = m.actualBoundingBoxAscent / 200;
    capMeasured = true;
  }
  return capRatio;
};

/**
 * How wide (font-stretch %) a word must be set to span the wordmark's width at the
 * wordmark's cap height. Measured once per word with the real font.
 */
const fitCache = new Map<string, { stretch: number; scale: number }>();
const fitText = (text: string, capH: number) => {
  const key = `${text}|${capH.toFixed(3)}`;
  const hit = fitCache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return { stretch: 62, scale: 1 };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", LOGO_VIEWBOX);
  svg.style.cssText = "position:absolute;visibility:hidden;width:1400px;left:-9999px;top:0";
  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  t.setAttribute("font-size", String(LOGO_CAP_HEIGHT / capH));
  t.setAttribute("class", styles.text);
  t.textContent = text.toUpperCase();
  svg.appendChild(t);
  document.body.appendChild(svg);
  const widthAt = (st: number) => {
    t.style.fontStretch = `${st}%`;
    return t.getComputedTextLength();
  };
  let lo = 62;
  let hi = 125;
  let wLo = widthAt(lo);
  let wHi = widthAt(hi);
  let out: { stretch: number; scale: number };
  if (wLo >= LOGO_WIDTH) {
    // even the narrowest cut is too wide: keep it narrow and set it smaller
    out = { stretch: 62, scale: (LOGO_WIDTH / wLo) * 0.995 };
  } else if (wHi <= LOGO_WIDTH) {
    out = { stretch: 125, scale: 1 };
  } else {
    let st = lo + ((LOGO_WIDTH - wLo) / (wHi - wLo)) * (hi - lo);
    for (let i = 0; i < 4; i++) {
      const w = widthAt(st);
      if (Math.abs(w - LOGO_WIDTH) < 0.3) break;
      if (w > LOGO_WIDTH) {
        hi = st;
        wHi = w;
      } else {
        lo = st;
        wLo = w;
      }
      st = lo + ((LOGO_WIDTH - wLo) / Math.max(0.001, wHi - wLo)) * (hi - lo);
    }
    out = { stretch: st, scale: 1 };
  }
  document.body.removeChild(svg);
  fitCache.set(key, out);
  return out;
};

function FaceArt({ face, capH, fit }: { face: Face; capH: number; fit: { stretch: number; scale: number } }) {
  if (face.kind === "logo") return <path d={LOGO_PATH} />;
  const size = (LOGO_CAP_HEIGHT / capH) * fit.scale;
  // centred on the wordmark's height when the word had to be set smaller
  const y = LOGO_CAP_HEIGHT - (LOGO_CAP_HEIGHT * (1 - fit.scale)) / 2;
  return (
    <text
      x={0}
      y={y}
      textLength={fit.scale < 1 ? undefined : LOGO_WIDTH}
      lengthAdjust="spacing"
      fontSize={size}
      className={styles.text}
      style={{ fontStretch: `${fit.stretch}%` }}
    >
      {face.text.toUpperCase()}
    </text>
  );
}

export function SliceWord({ face, tone = "khaki", origin = STRIPS / 2, className, style, onStrips, label }: Props) {
  const [layers, setLayers] = useState<Layer[]>(() => [{ face, tone, key: 0, state: "in" }]);
  // Start from the constant so server and client render the same; measure after mount.
  const [capH, setCapH] = useState(DEFAULT_CAP);
  const [fonts, setFonts] = useState(false);
  const keyRef = useRef(1);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef(true);
  const originRef = useRef(origin);
  useLayoutEffect(() => {
    originRef.current = origin;
  }, [origin]);

  useEffect(() => {
    document.fonts?.ready.then(() => {
      setCapH(measureCap());
      setFonts(true);
    });
  }, []);

  // A new face: everything on stage leaves, the new face enters.
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    setLayers((prev) => {
      const top = prev.find((l) => l.state === "in");
      if (top && top.face.id === face.id && top.tone === tone) return prev;
      return [...prev.map((l) => ({ ...l, state: "out" as const })), { face, tone, key: keyRef.current++, state: "in" }];
    });
  }, [face, tone]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = prefersReducedMotion();
    const from = Math.round(originRef.current);
    const tweens: gsap.core.Tween[] = [];

    for (const layer of layers) {
      const el = root.querySelector<HTMLElement>(`[data-layer="${layer.key}"]`);
      if (!el) continue;
      const strips = Array.from(el.querySelector("[data-strips]")?.children ?? []) as HTMLElement[];
      if (el.dataset.state === layer.state) continue;
      el.dataset.state = layer.state;
      const rest = () => setSliced(el, false);

      if (layer.state === "in") {
        if (reduced) {
          tweens.push(gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25 }));
        } else if (layers.length > 1) {
          setSliced(el, true);
          tweens.push(
            gsap.fromTo(
              strips,
              { yPercent: (i: number) => -DIR[i] * DIST[i] },
              {
                yPercent: 0,
                duration: 0.62,
                ease: "snap",
                stagger: { each: 0.016, from },
                delay: 0.05,
                overwrite: "auto",
                onComplete: rest,
              },
            ),
          );
        }
        onStrips?.({ strips, layer: el });
      } else {
        const done = () => setLayers((prev) => prev.filter((l) => l.key !== layer.key));
        if (reduced) {
          tweens.push(gsap.to(el, { opacity: 0, duration: 0.2, onComplete: done }));
        } else {
          setSliced(el, true);
          tweens.push(
            gsap.to(strips, {
              yPercent: (i: number) => DIR[i] * DIST[i],
              y: 0,
              duration: 0.5,
              ease: "cut",
              stagger: { each: 0.014, from },
              overwrite: "auto",
              onComplete: done,
            }),
          );
        }
      }
    }
    // Running exits are left alone on re-render; they remove their own layer.
    void tweens;
  }, [layers, onStrips]);

  useEffect(() => {
    const root = rootRef.current;
    return () => {
      if (root) gsap.killTweensOf(root.querySelectorAll("[data-layer], [data-strips] > *"));
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${className ?? ""}`}
      style={style}
      role="img"
      aria-label={label ?? (face.kind === "logo" ? "Scyte" : face.text)}
    >
      <div className={styles.sizer} style={{ aspectRatio: `${LOGO_WIDTH} / ${LOGO_CAP_HEIGHT + LOGO_OVERSHOOT}` }} />
      {layers.map((layer) => (
        <div
          key={layer.key}
          className={`${styles.layer} ${styles[layer.tone]}`}
          data-layer={layer.key}
          aria-hidden
        >
          {/* At rest the face is one unsliced drawing, so no strip seams ever show. */}
          <svg className={styles.whole} viewBox={LOGO_VIEWBOX} overflow="visible" fill="currentColor" focusable="false">
            <FaceArt face={layer.face} capH={capH} fit={fonts && layer.face.kind === "text" ? fitText(layer.face.text, capH) : NARROW} />
          </svg>
          <div className={styles.strips} data-strips>
            {Array.from({ length: STRIPS }, (_, i) => (
              <div
                key={i}
                className={styles.strip}
                style={{ clipPath: `inset(-40% ${100 - ((i + 1) / STRIPS) * 100}% -40% ${(i / STRIPS) * 100}%)` }}
              >
                <svg viewBox={LOGO_VIEWBOX} overflow="visible" fill="currentColor" focusable="false">
                  <FaceArt face={layer.face} capH={capH} fit={fonts && layer.face.kind === "text" ? fitText(layer.face.text, capH) : NARROW} />
                </svg>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
