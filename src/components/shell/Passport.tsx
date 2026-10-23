"use client";

import { useEffect, useRef } from "react";
import { ui, useStore } from "@/lib/store";
import { STAMPS, clearStamps, countStamps, setLumen, stamps } from "@/lib/stamps";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./Passport.module.css";

const date = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/**
 * The passport: every stamp, found or not. Found stamps are inked with the date; the
 * rest are blind-embossed with a hint. A native <dialog>, so focus, Escape and the
 * backdrop behave as people expect.
 */
export function Passport() {
  const open = useStore(ui, (s) => s.passportOpen);
  const found = useStore(stamps, (s) => s.found);
  const lumen = useStore(stamps, (s) => s.lumen);
  const dialog = useRef<HTMLDialogElement>(null);
  const n = countStamps(found);
  const all = n === STAMPS.length;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      if (!prefersReducedMotion()) gsap.fromTo(d.querySelectorAll("[data-stamp]"), { scale: 1.3, opacity: 0, rotation: -8 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: "snap", stagger: 0.05 });
    } else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={dialog} className={styles.passport} onClose={() => ui.set({ passportOpen: false })} aria-labelledby="passport-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className="t-hud c-khaki">Stamp passport</p>
          <h2 id="passport-title" className={styles.title}>
            {n} of {STAMPS.length} found
          </h2>
          <p className={`${styles.lede} t-small`}>One stamp hides on every page. They stay in this browser and are never sent anywhere.</p>
        </header>
        <ol className={styles.grid}>
          {STAMPS.map((s, i) => {
            const at = found[s.id];
            return (
              <li key={s.id} className={styles.stamp} data-found={at ? "1" : undefined} data-stamp style={{ rotate: `${((i * 37) % 11) - 5}deg` }}>
                <span className={styles.ring} aria-hidden>
                  <span className={styles.page}>{s.page}</span>
                  <span className={styles.name}>{s.name}</span>
                  <span className={styles.when}>{at ? date(at) : "—"}</span>
                </span>
                <span className={`${styles.caption} t-small`}>{at ? s.found : s.hint}</span>
                <span className="sr-only">{at ? `${s.name}, found` : `${s.name}, not found yet`}</span>
              </li>
            );
          })}
        </ol>
        <footer className={styles.foot}>
          {all ? (
            <button type="button" className={`${styles.action} t-hud`} onClick={() => setLumen(!lumen)} aria-pressed={lumen}>
              Lumen mode {lumen ? "on" : "off"}
            </button>
          ) : (
            <span className="t-hud c-muted">Find all {STAMPS.length} to unlock Lumen mode</span>
          )}
          {n ? (
            <button type="button" className={`${styles.action} t-hud`} onClick={clearStamps}>
              Clear passport
            </button>
          ) : null}
          <button type="button" className={`${styles.close} t-hud`} onClick={() => ui.set({ passportOpen: false })}>
            Close
          </button>
        </footer>
      </div>
    </dialog>
  );
}
