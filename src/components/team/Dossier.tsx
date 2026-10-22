"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { displayName, hexId, type Member } from "@/data/team";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { scroller } from "@/components/providers/SmoothScroll";
import { Portrait } from "./Portrait";
import styles from "./Dossier.module.css";

type Props = { member: Member; fromEl: HTMLElement | null; onClose: () => void };

/**
 * The full dossier. The portrait flies from its thumbnail to its place here (a
 * shared-element transition) and the panels reflow around it. Back or Escape reverses.
 */
export function Dossier({ member, fromEl, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const portrait = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  useLayoutEffect(() => {
    const el = root.current;
    const target = portrait.current;
    if (!el || !target) return;
    scroller.lenis?.stop();
    const reduced = prefersReducedMotion();
    const img = fromEl?.querySelector("img");
    const tl = gsap.timeline();
    if (img && !reduced) {
      // FLIP from the thumbnail's rect to the dossier slot
      const from = img.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      tl.fromTo(
        target,
        {
          x: from.left - to.left,
          y: from.top - to.top,
          scaleX: from.width / to.width,
          scaleY: from.height / to.height,
          transformOrigin: "0 0",
        },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.8, ease: "latch" },
      );
    }
    tl.fromTo(el.querySelector("[data-bg]"), { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "none" }, 0);
    if (!reduced) {
      tl.fromTo(
        el.querySelectorAll("[data-reflow]"),
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, ease: "glide", stagger: 0.06 },
        0.25,
      );
    }
    el.querySelector<HTMLElement>("[data-close]")?.focus({ preventScroll: true });
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const el = root.current;
    const target = portrait.current;
    const img = fromEl?.querySelector("img");
    const done = () => {
      scroller.lenis?.start();
      onClose();
      fromEl?.focus({ preventScroll: true });
    };
    if (!el || !target || prefersReducedMotion()) return done();
    const tl = gsap.timeline({ onComplete: done });
    tl.to(el.querySelectorAll("[data-reflow]"), { y: -16, opacity: 0, duration: 0.25, ease: "cut", stagger: 0.02 });
    if (img) {
      const from = target.getBoundingClientRect();
      const to = img.getBoundingClientRect();
      tl.to(
        target,
        {
          x: `+=${to.left - from.left}`,
          y: `+=${to.top - from.top}`,
          scaleX: to.width / from.width,
          scaleY: to.height / from.height,
          transformOrigin: "0 0",
          duration: 0.6,
          ease: "latch",
        },
        0.05,
      );
    }
    tl.to(el.querySelector("[data-bg]"), { opacity: 0, duration: 0.3 }, "-=0.3");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onPop = () => close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const name = displayName(member);

  return (
    <div ref={root} className={styles.dossier} role="dialog" aria-modal="true" aria-labelledby="dossier-name">
      <div className={styles.bg} data-bg />
      <div className={styles.scroll} data-lenis-prevent>
        <div className={styles.inner}>
          <button type="button" className={styles.close} onClick={close} data-close>
            Back to the team <span aria-hidden>Esc</span>
          </button>

          <div className={styles.portraitCol}>
            <div ref={portrait} className={styles.portrait}>
              <Portrait member={member} className={styles.portraitImg} size="large" />
              <span className={styles.corner} aria-hidden />
            </div>
            <p className={styles.caption} data-reflow>
              {member.photo ? "Portrait" : "Generated placeholder. Supply a photo in src/data/team.ts."}
            </p>
          </div>

          <div className={styles.body}>
            <p className={styles.id} data-reflow>
              <span className="t-num">{hexId(member.slug)}</span>
              <span>{member.codename ?? "[ FILL: codename ]"}</span>
            </p>
            <h2 id="dossier-name" className={styles.name} data-reflow>
              {name}
            </h2>
            <p className={styles.role} data-reflow>
              {member.role}
            </p>
            {member.name ? null : (
              <p className={styles.fillNote} data-reflow>
                <span className="fill">[ FILL ]</span> This seat comes from the plan in our business report. The person
                in it has not been listed yet.
              </p>
            )}

            <section className={styles.block} data-reflow aria-labelledby="d-bio">
              <h3 id="d-bio">Bio</h3>
              {member.bio ? <p className={styles.bio}>{member.bio}</p> : <p className="fill">[ FILL: bio, two or three lines ]</p>}
            </section>

            <section className={styles.block} data-reflow aria-labelledby="d-skills">
              <h3 id="d-skills">Skills</h3>
              <ul className={styles.skills}>
                {member.skills.map((s) => (
                  <li key={s.label}>
                    <span>{s.label}</span>
                    <span className={styles.meter} data-empty={s.value === null ? "1" : undefined}>
                      <i style={{ width: `${s.value ?? 0}%` }} />
                    </span>
                    <span className="t-num">{s.value ?? "[ FILL ]"}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.block} data-reflow aria-labelledby="d-tools">
              <h3 id="d-tools">Loadout</h3>
              <ul className={styles.chips}>
                {member.tools.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>

            <section className={styles.block} data-reflow aria-labelledby="d-projects">
              <h3 id="d-projects">Projects</h3>
              {member.projects.length ? (
                <ul className={styles.list}>
                  {member.projects.map((p) => (
                    <li key={p.name}>
                      <span className="t-num">{p.year}</span>
                      <strong>{p.name}</strong>
                      <span>{p.note}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>
                  Nothing listed yet. Projects appear here as one line each: year, name, what they did.
                </p>
              )}
            </section>

            <section className={styles.block} data-reflow aria-labelledby="d-timeline">
              <h3 id="d-timeline">Timeline</h3>
              {member.timeline.length ? (
                <ol className={styles.list}>
                  {member.timeline.map((t) => (
                    <li key={t.year + t.event}>
                      <span className="t-num">{t.year}</span>
                      <span>{t.event}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.empty}>No entries yet.</p>
              )}
            </section>

            <section className={styles.block} data-reflow aria-labelledby="d-links">
              <h3 id="d-links">Links</h3>
              {member.links.length ? (
                <ul className={styles.chips}>
                  {member.links.map((l) => (
                    <li key={l.href}>
                      <a href={l.href} target="_blank" rel="noopener noreferrer">
                        {l.label ?? l.kind}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fill">[ FILL: LinkedIn, GitHub, X, email ]</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
