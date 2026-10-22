"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { LOGO_CAP_HEIGHT, LOGO_OVERSHOOT, LOGO_PATH, LOGO_VIEWBOX, LOGO_WIDTH, LOGO_STROKE } from "@/lib/logo/geometry";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./SliceWord.module.css";

/** One strip per logo stroke: 140 / 5 = 28 strips. */
export const STRIPS = LOGO_WIDTH / LOGO_STROKE;

export type Face = { id: string; kind: "logo" } | { id: string; kind: "text"; text: string };

export type Tone = "bone" | "signal" | "paper" | "ink";

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
let capRatio = DEFAULT_CAP;
let capMeasured = false;
const measureCap = () => {
  if (capMeasured || typeof document === "undefined") return capRatio;
  const c = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-big-shoulders").trim();
  if (!c || !family) return capRatio;
  c.font = `900 200px ${family}`;
  const m = c.measureText("H");
  if (m.actualBoundingBoxAscent > 0) {
    capRatio = m.actualBoundingBoxAscent / 200;
    capMeasured = true;
  }
  return capRatio;
};

function FaceArt({ face, capH }: { face: Face; capH: number }) {
  if (face.kind === "logo") return <path d={LOGO_PATH} />;
  return (
    <text
      x={0}
      y={LOGO_CAP_HEIGHT}
      textLength={LOGO_WIDTH}
      lengthAdjust="spacingAndGlyphs"
      fontSize={LOGO_CAP_HEIGHT / capH}
      className={styles.text}
    >
      {face.text.toUpperCase()}
    </text>
  );
}

export function SliceWord({ face, tone = "bone", origin = STRIPS / 2, className, style, onStrips, label }: Props) {
  const [layers, setLayers] = useState<Layer[]>(() => [{ face, tone, key: 0, state: "in" }]);
  // Start from the constant so server and client render the same; measure after mount.
  const [capH, setCapH] = useState(DEFAULT_CAP);
  const keyRef = useRef(1);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef(true);
  const originRef = useRef(origin);
  useLayoutEffect(() => {
    originRef.current = origin;
  }, [origin]);

  useEffect(() => {
    document.fonts?.ready.then(() => setCapH(measureCap()));
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
                ease: "latch",
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
            <FaceArt face={layer.face} capH={capH} />
          </svg>
          <div className={styles.strips} data-strips>
            {Array.from({ length: STRIPS }, (_, i) => (
              <div
                key={i}
                className={styles.strip}
                style={{ clipPath: `inset(-40% ${100 - ((i + 1) / STRIPS) * 100}% -40% ${(i / STRIPS) * 100}%)` }}
              >
                <svg viewBox={LOGO_VIEWBOX} overflow="visible" fill="currentColor" focusable="false">
                  <FaceArt face={layer.face} capH={capH} />
                </svg>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
