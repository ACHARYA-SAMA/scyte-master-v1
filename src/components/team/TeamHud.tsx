"use client";

import { useEffect, useRef, useState } from "react";
import { hexId, type Member } from "@/data/team";
import { readAnchor } from "@/components/gl/anchors";
import { scan } from "@/components/gl/scenes/team/scan";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import styles from "./TeamHud.module.css";

const FILL = (what: string) => `[ FILL: ${what} ]`;

/** Five skills as a radar on segmented rings. Unknown values draw as dashed, empty spokes. */
function Radar({ skills }: { skills: Member["skills"] }) {
  const n = skills.length;
  const R = 54;
  const pt = (i: number, r: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [60 + Math.cos(a) * r, 60 + Math.sin(a) * r];
  };
  const known = skills.every((s) => s.value !== null);
  const poly = skills.map((s, i) => pt(i, ((s.value ?? 0) / 100) * R).join(",")).join(" ");
  return (
    <svg viewBox="0 0 120 120" className={styles.radar} role="img" aria-label={known ? skills.map((s) => `${s.label} ${s.value}`).join(", ") : "Skills not yet filled in"}>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={skills.map((_, i) => pt(i, R * k).join(",")).join(" ")} className={styles.ring} />
      ))}
      {skills.map((s, i) => {
        const [x, y] = pt(i, R);
        return <line key={s.label} x1={60} y1={60} x2={x} y2={y} className={styles.spoke} data-empty={s.value === null ? "1" : undefined} />;
      })}
      {known ? <polygon points={poly} className={styles.area} /> : null}
      {skills.map((s, i) => {
        const [x, y] = pt(i, R + 9);
        return (
          <text key={s.label} x={x} y={y} className={styles.radarLabel} textAnchor={x < 55 ? "end" : x > 65 ? "start" : "middle"} dominantBaseline="middle">
            {s.label}
          </text>
        );
      })}
    </svg>
  );
}

/** A quiet waveform: the scanner's carrier, never decoration at full volume. */
function Wave({ live }: { live: boolean }) {
  const path = useRef<SVGPathElement>(null);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const t = performance.now() / 1000;
      let d = "";
      for (let x = 0; x <= 200; x += 4) {
        const amp = live ? 7 : 2;
        const y = 14 + Math.sin(x * 0.11 + t * 3) * amp * Math.sin(x * 0.015 + t * 0.7) + Math.sin(x * 0.4 + t * 9) * (live ? 1.2 : 0.4);
        d += (x ? "L" : "M") + x + " " + y.toFixed(2);
      }
      path.current?.setAttribute("d", d);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [live]);
  return (
    <svg viewBox="0 0 200 28" className={styles.wave} aria-hidden>
      <path ref={path} d="M0 14 H200" />
    </svg>
  );
}

/** Types a line out, character by character, after the frame has drawn. */
function TypeOut({ text, delay = 0.45 }: { text: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.textContent = text;
      return;
    }
    el.textContent = "";
    const s = { n: 0 };
    const tween = gsap.to(s, {
      n: text.length,
      duration: Math.min(1.6, 0.25 + text.length * 0.012),
      delay,
      ease: "none",
      onUpdate: () => {
        const n = Math.round(s.n);
        if (el.textContent?.length !== n) {
          el.textContent = text.slice(0, n);
          if (n % 3 === 0) sfx.tick();
        }
      },
    });
    return () => {
      tween.kill();
    };
  }, [text, delay]);
  return <span ref={ref} aria-hidden />;
}

function Clock({ since }: { since: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Math.max(0, (performance.now() - since) / 1000);
      if (ref.current) ref.current.textContent = `${String(Math.floor(t / 60)).padStart(2, "0")}:${(t % 60).toFixed(1).padStart(4, "0")}`;
      const rot = scan.get().rot;
      const r = ref.current?.parentElement?.parentElement?.querySelector<HTMLElement>("[data-rot]");
      if (r) r.textContent = `${rot >= 0 ? "+" : "−"}${String(Math.abs(rot)).padStart(2, "0")}°`;
    }, 100);
    return () => window.clearInterval(id);
  }, [since]);
  return <span ref={ref}>00:00.0</span>;
}

/**
 * The HUD around the hologram: hairline panels that draw their frame first, then
 * their text, joined to the face by leader lines at the logo's own angles.
 */
export function TeamHud({ member, index, total, attract }: { member: Member | null; index: number; total: number; attract: boolean }) {
  const lines = useRef<SVGSVGElement>(null);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const [lockedAt, setLockedAt] = useState(0);

  useEffect(() => {
    if (!member) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the lock time is the moment the selection lands
    setLockedAt(performance.now());
    sfx.lock();
  }, [member]);

  // leader lines from the face to the inside edges of the two panel stacks
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const svg = lines.current;
      if (!svg) return;
      const face = readAnchor("face");
      const crown = readAnchor("crown");
      const shoulder = readAnchor("shoulder");
      const box = svg.getBoundingClientRect();
      const paths = svg.querySelectorAll("path");
      const toPanel = (from: { x: number; y: number } | undefined, el: HTMLElement | null, side: "l" | "r", p: SVGPathElement | undefined) => {
        if (!p) return;
        if (!from || !el || !member) {
          p.setAttribute("d", "");
          return;
        }
        const r = el.getBoundingClientRect();
        const x0 = from.x - box.left;
        const y0 = from.y - box.top;
        const x1 = (side === "l" ? r.right : r.left) - box.left;
        const y1 = r.top + 24 - box.top;
        // a 45 degree run, then level into the panel
        const dy = y1 - y0;
        const kx = x0 + (side === "l" ? -1 : 1) * Math.abs(dy);
        const bend = side === "l" ? Math.max(kx, x1 + 20) : Math.min(kx, x1 - 20);
        p.setAttribute("d", `M${x0.toFixed(1)} ${y0.toFixed(1)} L${bend.toFixed(1)} ${(y0 + Math.sign(dy) * Math.abs(bend - x0)).toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)}`);
      };
      toPanel(face, left.current?.querySelector("[data-panel='id']") ?? null, "l", paths[0]);
      toPanel(crown, right.current?.querySelector("[data-panel='bio']") ?? null, "r", paths[1]);
      toPanel(shoulder, left.current?.querySelector("[data-panel='skills']") ?? null, "l", paths[2]);
      const dot = svg.querySelector<SVGRectElement>("rect");
      if (dot && face && member) {
        dot.setAttribute("x", String(face.x - box.left - 4));
        dot.setAttribute("y", String(face.y - box.top - 4));
        dot.style.opacity = "1";
      } else if (dot) dot.style.opacity = "0";
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [member]);

  const key = member?.slug ?? "none";

  return (
    <div className={styles.hud} data-on={member ? "1" : "0"} aria-hidden={!member}>
      <svg ref={lines} className={styles.lines} aria-hidden>
        <path />
        <path />
        <path />
        <rect width={8} height={8} />
      </svg>

      <div ref={left} className={styles.col} data-side="left">
        <section key={`id-${key}`} className={styles.panel} data-panel="id">
          <p className={`${styles.ph} t-hud`}>
            <span>Subject {String(index + 1).padStart(2, "0")} of {String(total).padStart(2, "0")}</span>
            <span className="t-num">{member ? hexId(member.slug) : ""}</span>
          </p>
          <p className={styles.codename}>{member?.codename ?? FILL("codename")}</p>
          <p className={styles.name} data-fill={member?.name ? undefined : "1"}>
            {member?.name ?? FILL("name")}
          </p>
          <p className={styles.role}>{member?.role}</p>
          <dl className={styles.kv}>
            <div>
              <dt className="t-hud">Location</dt>
              <dd>{member?.location ?? FILL("city")}</dd>
            </div>
            <div>
              <dt className="t-hud">Joined</dt>
              <dd>{member?.joined ?? FILL("year")}</dd>
            </div>
          </dl>
        </section>
        <section key={`sk-${key}`} className={styles.panel} data-panel="skills">
          <p className={`${styles.ph} t-hud`}>
            <span>Skills</span>
            <span>{member?.skills.every((s) => s.value !== null) ? "self-rated" : FILL("0 to 100 each")}</span>
          </p>
          {member ? <Radar skills={member.skills} /> : null}
        </section>
      </div>

      <div ref={right} className={styles.col} data-side="right">
        <section key={`bio-${key}`} className={styles.panel} data-panel="bio">
          <p className={`${styles.ph} t-hud`}>
            <span>Bio</span>
            <span>decoded</span>
          </p>
          <p className={styles.bio}>
            {member ? <TypeOut text={member.bio ?? FILL("two lines, in their own words")} /> : null}
            <span className="sr-only">{member?.bio ?? "Bio not yet filled in."}</span>
          </p>
        </section>
        <section key={`now-${key}`} className={styles.panel} data-panel="now">
          <dl className={styles.kv}>
            <div>
              <dt className="t-hud">Currently</dt>
              <dd>{member?.currently ?? FILL("what they are working on")}</dd>
            </div>
            <div>
              <dt className="t-hud">Tools</dt>
              <dd className={styles.tools}>
                {member?.tools.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </dd>
            </div>
          </dl>
        </section>
        <section className={styles.panel} data-panel="signal">
          <div className={`${styles.readouts} t-hud`}>
            <span>
              Lock <Clock since={lockedAt} />
            </span>
            <span>
              Turn <span data-rot>+00°</span>
            </span>
            <span>{attract ? "Scanning" : "Held"}</span>
          </div>
          <Wave live={!!member} />
        </section>
        {member?.links.portfolio ? (
          <a className={`${styles.portfolio} cta`} href={member.links.portfolio} target="_blank" rel="noopener noreferrer" data-magnetic data-cursor="open">
            <span>Visit portfolio</span>
            <span className={styles.out} aria-hidden />
          </a>
        ) : (
          <button type="button" className={styles.portfolio} disabled>
            <span>Portfolio coming soon</span>
          </button>
        )}
      </div>
    </div>
  );
}
