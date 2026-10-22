"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { hexId, type Member } from "@/data/team";
import { FACE, SIL_H, SIL_W } from "@/lib/silhouette";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { bridge } from "@/components/stage/bridge";
import styles from "./TeamHud.module.css";

const FILL = "[ FILL ]";

/** Where the portrait's face lands on screen, through the same cover-fit the shader uses. */
export const faceOnScreen = (w: number, h: number) => {
  const A = w / h;
  const T = SIL_W / SIL_H;
  const sx = A > T ? 1 : A / T;
  const sy = A > T ? T / A : 1;
  return { x: ((FACE.x - 0.5) / sx + 0.5) * w, y: ((FACE.y - 0.5) / sy + 0.5) * h };
};

const charsOf = (text: string) => Array.from(new Set(text.replace(/\s/g, ""))).join("") || "0";

function Radar({ skills }: { skills: Member["skills"] }) {
  const n = skills.length;
  const R = 62;
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [80 + Math.cos(a) * r, 80 + Math.sin(a) * r];
  };
  const filled = skills.every((s) => s.value !== null);
  const poly = skills.map((s, i) => pt(i, ((s.value ?? 0) / 100) * R).join(",")).join(" ");
  return (
    <svg viewBox="0 0 160 160" className={styles.radar} aria-hidden>
      {[0.33, 0.66, 1].map((k) => (
        <polygon
          key={k}
          points={skills.map((_, i) => pt(i, R * k).join(",")).join(" ")}
          className={styles.radarRing}
        />
      ))}
      {skills.map((s, i) => {
        const [x, y] = pt(i, R);
        const [lx, ly] = pt(i, R + 12);
        return (
          <g key={s.label}>
            <line x1={80} y1={80} x2={x} y2={y} className={styles.radarSpoke} data-empty={s.value === null ? "1" : undefined} />
            <text x={lx} y={ly} className={styles.radarLabel} textAnchor={lx < 70 ? "end" : lx > 90 ? "start" : "middle"}>
              {s.label}
            </text>
          </g>
        );
      })}
      {filled ? <polygon points={poly} className={styles.radarShape} data-shape /> : null}
      {!filled ? (
        <text x={80} y={83} className={styles.radarFill} textAnchor="middle">
          {FILL}
        </text>
      ) : null}
    </svg>
  );
}

function Wave({ seed }: { seed: string }) {
  const d = useMemo(() => {
    let h = 0;
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const pts: string[] = [];
    for (let i = 0; i <= 120; i++) {
      h = (h * 1664525 + 1013904223) >>> 0;
      const noise = (h / 4294967296 - 0.5) * 6;
      const y = 14 + Math.sin(i * 0.42) * 6 + Math.sin(i * 0.11 + 1) * 3 + noise;
      pts.push(`${i ? "L" : "M"}${i * 2} ${y.toFixed(1)}`);
    }
    return pts.join("");
  }, [seed]);
  return (
    <svg viewBox="0 0 240 28" className={styles.wave} preserveAspectRatio="none" aria-hidden>
      <path d={d} />
      <path d={d} transform="translate(240 0)" />
    </svg>
  );
}

type Props = { member: Member | null; index: number; total: number; scanning: boolean };

export function TeamHud({ member, index, total, scanning }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1440, h: 900 });
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const face = faceOnScreen(size.w, size.h);

  // Leader lines from the face to the nearest edge of each panel.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const panels = Array.from(el.querySelectorAll<HTMLElement>("[data-panel]"));
    setLines(
      panels.map((p) => {
        const r = p.getBoundingClientRect();
        const x2 = r.left > face.x ? r.left : r.right;
        const y2 = Math.min(Math.max(face.y, r.top + 14), r.bottom - 14);
        return { x1: face.x, y1: face.y, x2, y2 };
      }),
    );
  }, [face.x, face.y, member]);

  // Assembly: brackets snap, the scan sweeps the face, lines draw out, panels decode.
  useEffect(() => {
    const el = root.current;
    if (!el || !member) return;
    const reduced = prefersReducedMotion();
    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set(el.querySelectorAll("[data-panel], [data-bracket], [data-line]"), { clearProps: "all", opacity: 1 });
        return;
      }
      const tl = gsap.timeline();
      tl.fromTo(
        el.querySelectorAll("[data-bracket]"),
        { scale: 1.6, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.32, ease: "latch", stagger: 0.03 },
      );
      const scan = { y: 0.04 };
      tl.add(() => sfx.scan(), 0.05);
      tl.to(
        scan,
        {
          y: 0.7,
          duration: 0.55,
          ease: "drift",
          onUpdate: () => {
            bridge.scan = scan.y;
          },
          onComplete: () => {
            bridge.scan = -1;
          },
        },
        0.05,
      );
      tl.fromTo(el.querySelector("[data-scanline]"), { yPercent: 0, opacity: 1 }, { yPercent: 1000, opacity: 0, duration: 0.55, ease: "drift" }, 0.05);
      tl.fromTo(
        el.querySelectorAll("[data-line]"),
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 0.32, ease: "glide", stagger: 0.06 },
        0.14,
      );
      tl.fromTo(
        el.querySelectorAll("[data-panel]"),
        { opacity: 0, clipPath: "inset(0 100% 0 0)" },
        { opacity: 1, clipPath: "inset(0 0% 0 0)", duration: 0.34, ease: "latch", stagger: 0.07 },
        0.2,
      );
      el.querySelectorAll<HTMLElement>("[data-decode]").forEach((node, i) => {
        const text = node.dataset.decode ?? "";
        tl.to(
          node,
          {
            duration: Math.min(0.7, 0.18 + text.length * 0.012),
            scrambleText: { text, chars: charsOf(text), speed: 0.9, revealDelay: 0.05 },
            ease: "none",
            onStart: () => sfx.tick(),
          },
          0.26 + i * 0.025,
        );
      });
      const shape = el.querySelector("[data-shape]");
      if (shape) tl.fromTo(shape, { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.5, ease: "latch" }, 0.4);
    }, el);
    return () => {
      ctx.revert();
      bridge.scan = -1;
    };
  }, [member]);

  const show = member !== null;
  const m = member;
  const name = m?.name ?? FILL;
  const codename = m?.codename ?? FILL;
  const coords = m?.coordinates ? `${m.coordinates.lat.toFixed(3)}° N  ${m.coordinates.lon.toFixed(3)}° E` : FILL;

  return (
    <div ref={root} className={styles.hud} data-show={show ? "1" : "0"} aria-hidden={!show}>
      <svg className={styles.lines} width={size.w} height={size.h} aria-hidden>
        {show
          ? lines.map((l, i) => (
              <path
                key={i}
                d={`M${l.x1} ${l.y1} L${(l.x1 + l.x2) / 2} ${l.y1} L${(l.x1 + l.x2) / 2} ${l.y2} L${l.x2} ${l.y2}`}
                pathLength={1}
                className={styles.line}
                data-line
              />
            ))
          : null}
      </svg>

      <div className={styles.focus} style={{ left: face.x, top: face.y }} aria-hidden>
        <i data-bracket />
        <i data-bracket />
        <i data-bracket />
        <i data-bracket />
        <span className={styles.scanline} data-scanline />
        <span className={styles.reticle} />
      </div>

      {m ? (
        <>
          <section className={`${styles.panel} ${styles.tl}`} data-panel aria-label="Identity">
            <p className={styles.k}>
              <span data-decode={hexId(m.slug)}>{hexId(m.slug)}</span>
              <span className={styles.idx}>
                {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
              </span>
            </p>
            <dl className={styles.rows}>
              <div>
                <dt>Codename</dt>
                <dd data-decode={codename} data-fill={m.codename ? undefined : "1"}>
                  {codename}
                </dd>
              </div>
              <div>
                <dt>Name</dt>
                <dd data-decode={name} data-fill={m.name ? undefined : "1"}>
                  {name}
                </dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd data-decode={m.role}>{m.role}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd className={styles.status} data-decode={scanning ? "Scanning" : m.status}>
                  {scanning ? "Scanning" : m.status}
                </dd>
              </div>
            </dl>
          </section>

          <section className={`${styles.panel} ${styles.tr}`} data-panel aria-label="Field data">
            <dl className={styles.rows}>
              <div>
                <dt>Location</dt>
                <dd data-decode={m.location ?? FILL} data-fill={m.location ? undefined : "1"}>
                  {m.location ?? FILL}
                </dd>
              </div>
              <div>
                <dt>Coordinates</dt>
                <dd data-decode={coords} data-fill={m.coordinates ? undefined : "1"}>
                  {coords}
                </dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd data-decode={m.joined ?? FILL} data-fill={m.joined ? undefined : "1"}>
                  {m.joined ?? FILL}
                </dd>
              </div>
              <div>
                <dt>Currently</dt>
                <dd data-decode={m.currently ?? FILL} data-fill={m.currently ? undefined : "1"}>
                  {m.currently ?? FILL}
                </dd>
              </div>
            </dl>
          </section>

          <section className={`${styles.panel} ${styles.bl}`} data-panel aria-label="Skills">
            <p className={styles.k}>Skills</p>
            <Radar skills={m.skills} />
            <p className={styles.k}>Signal</p>
            <Wave seed={m.slug} />
          </section>

          <section className={`${styles.panel} ${styles.br}`} data-panel aria-label="Loadout and links">
            <p className={styles.k}>Loadout</p>
            <ul className={styles.chips}>
              {m.tools.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className={styles.k}>Bio</p>
            <p className={styles.bio} data-decode={m.bio ?? FILL} data-fill={m.bio ? undefined : "1"}>
              {m.bio ?? FILL}
            </p>
            <div className={styles.links}>
              {m.links.length ? (
                m.links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    {l.label ?? l.kind}
                  </a>
                ))
              ) : (
                <span className="fill">[ FILL: links ]</span>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
