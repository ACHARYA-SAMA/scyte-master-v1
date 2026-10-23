"use client";

import { useEffect, useRef } from "react";
import { displayName, hexId, type Member } from "@/data/team";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { scroller } from "@/components/providers/SmoothScroll";
import { Portrait } from "./Portrait";
import styles from "./Dossier.module.css";

const FILL = (what: string) => <span className="fill">[ FILL: {what} ]</span>;

const LINKS: { key: keyof Member["links"]; label: string }[] = [
  { key: "portfolio", label: "Portfolio" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "x", label: "X" },
  { key: "email", label: "Email" },
];

/**
 * The full dossier. The thumbnail grows into the large portrait (a shared-element
 * move), the record slides in beside it. Escape, the close button or Back close it.
 */
export function Dossier({ member, fromEl, onClose }: { member: Member; fromEl: HTMLElement | null; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const portrait = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    scroller.lenis?.stop();
    const el = root.current;
    const p = portrait.current;
    const reduced = prefersReducedMotion();
    const from = fromEl?.querySelector("img, span")?.getBoundingClientRect();
    if (el && p && from && !reduced) {
      const to = p.getBoundingClientRect();
      gsap.fromTo(
        p,
        { x: from.left - to.left, y: from.top - to.top, scaleX: from.width / to.width, scaleY: from.height / to.height, transformOrigin: "0 0" },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.8, ease: "snap" },
      );
      gsap.fromTo(el.querySelectorAll("[data-row]"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, ease: "glide", stagger: 0.04, delay: 0.25 });
    }
    close.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !el) return;
      const f = el.querySelectorAll<HTMLElement>("a, button");
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onPop = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      scroller.lenis?.start();
      fromEl?.focus({ preventScroll: true });
    };
  }, [fromEl, onClose]);

  return (
    <div ref={root} className={styles.dossier} role="dialog" aria-modal="true" aria-label={`Dossier: ${displayName(member)}`} data-lenis-prevent>
      <div ref={portrait} className={styles.portrait}>
        <Portrait member={member} size="large" className={styles.img} />
        <span className={`${styles.tag} t-hud`}>{member.photo ? "Photo" : "Placeholder silhouette, no photo yet"}</span>
      </div>
      <div className={styles.record}>
        <header className={styles.head} data-row>
          <p className="t-hud c-muted">
            Dossier <span className="t-num">{hexId(member.slug)}</span>
          </p>
          <button ref={close} type="button" className={styles.close} onClick={onClose} data-cursor="tap">
            Close <kbd>Esc</kbd>
          </button>
        </header>
        <p className={`${styles.codename} t-hud`} data-row>
          {member.codename ?? FILL("codename")}
        </p>
        <h2 className={styles.name} data-row>
          {member.name ?? FILL("name")}
        </h2>
        <p className={styles.role} data-row>
          {member.role}
        </p>
        <dl className={styles.facts} data-row>
          <div>
            <dt className="t-hud">Location</dt>
            <dd>{member.location ?? FILL("city")}</dd>
          </div>
          <div>
            <dt className="t-hud">Joined</dt>
            <dd>{member.joined ?? FILL("year")}</dd>
          </div>
          <div>
            <dt className="t-hud">Currently</dt>
            <dd>{member.currently ?? FILL("current work")}</dd>
          </div>
        </dl>
        <div className={styles.bio} data-row>
          {member.bio ? <p>{member.bio}</p> : <p>{FILL("a short bio, in their own words")}</p>}
        </div>
        <div className={styles.skills} data-row>
          <p className="t-hud c-muted">Skills</p>
          <ul>
            {member.skills.map((s) => (
              <li key={s.label}>
                <span>{s.label}</span>
                <span className={styles.meter} aria-label={s.value === null ? "not yet rated" : `${s.value} of 100`}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <i key={i} data-on={s.value !== null && i < Math.round(s.value / 10) ? "1" : undefined} data-empty={s.value === null ? "1" : undefined} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.tools} data-row>
          <p className="t-hud c-muted">Tools</p>
          <p>
            {member.tools.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </p>
        </div>
        <ul className={styles.links} data-row>
          {LINKS.map((l) => {
            const href = member.links[l.key];
            const url = href && l.key === "email" ? `mailto:${href}` : href;
            return (
              <li key={l.key}>
                {url ? (
                  <a href={url} target={l.key === "email" ? undefined : "_blank"} rel="noopener noreferrer" className={l.key === "portfolio" ? styles.primary : undefined}>
                    {l.key === "portfolio" ? "Visit portfolio" : l.label}
                  </a>
                ) : (
                  <span className={styles.missing}>{l.key === "portfolio" ? "Portfolio coming soon" : `${l.label}: [ FILL ]`}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
