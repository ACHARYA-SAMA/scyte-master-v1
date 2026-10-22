"use client";

import { useId, useRef, useState } from "react";
import { SERVICES, type Service } from "@/data/services";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { TransitionLink } from "@/components/transition/navigation";
import styles from "./Services.module.css";

/** Small live mock per service: it assembles itself when its drawer opens. */
function Mock({ id }: { id: Service["id"] }) {
  if (id === "website") {
    return (
      <div className={`${styles.mock} ${styles.browser}`} aria-hidden>
        <div className={styles.chrome}>
          <i />
          <i />
          <i />
          <span />
        </div>
        <div className={styles.page}>
          <b data-piece style={{ gridArea: "a" }} />
          <b data-piece style={{ gridArea: "b" }} />
          <b data-piece style={{ gridArea: "c" }} />
          <b data-piece style={{ gridArea: "d" }} />
          <b data-piece style={{ gridArea: "e" }} />
          <b data-piece style={{ gridArea: "f" }} />
        </div>
      </div>
    );
  }
  if (id === "apps") {
    return (
      <div className={`${styles.mock} ${styles.device}`} aria-hidden>
        <div className={styles.icons}>
          {Array.from({ length: 12 }, (_, i) => (
            <b key={i} data-piece data-hot={i === 5 ? "1" : undefined} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={`${styles.mock} ${styles.feed}`} aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <b key={i} data-piece data-tall={i % 4 === 1 ? "1" : undefined} />
      ))}
    </div>
  );
}

function Drawer({ service, open, onToggle }: { service: Service; open: boolean; onToggle: () => void }) {
  const body = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useGSAP(
    () => {
      const el = body.current;
      if (!el) return;
      const reduced = prefersReducedMotion();
      if (open) {
        gsap.to(el, { height: "auto", duration: reduced ? 0 : 0.6, ease: "latch" });
        if (!reduced) {
          gsap.fromTo(
            el.querySelectorAll("[data-promise]"),
            { yPercent: 100, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.5, ease: "glide", stagger: 0.05, delay: 0.12 },
          );
          gsap.fromTo(
            el.querySelectorAll("[data-piece]"),
            { scale: 0 },
            { scale: 1, duration: 0.42, ease: "latch", stagger: { each: 0.05, from: "start" }, delay: 0.2 },
          );
        }
      } else {
        gsap.to(el, { height: 0, duration: reduced ? 0 : 0.45, ease: "cut" });
      }
    },
    { dependencies: [open] },
  );

  return (
    <li className={styles.drawer} data-open={open ? "1" : "0"}>
      <h3 className={styles.head}>
        <button
          type="button"
          className={styles.trigger}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            sfx.slice();
            onToggle();
          }}
        >
          <span className={styles.name}>{service.name}</span>
          <span className={styles.line}>{service.line}</span>
          <span className={styles.toggle} aria-hidden />
        </button>
      </h3>
      <div ref={body} id={panelId} className={styles.body} role="region" aria-label={service.name}>
        <div className={styles.bodyInner}>
          <ul className={styles.promises}>
            {service.promises.map((p) => (
              <li key={p} className={styles.promise}>
                <span data-promise>{p}</span>
              </li>
            ))}
          </ul>
          <Mock id={service.id} />
        </div>
      </div>
    </li>
  );
}

export function Services({ heading = true }: { heading?: boolean }) {
  const [open, setOpen] = useState<Service["id"] | null>("website");
  return (
    <section className={styles.section} aria-labelledby="services-title">
      {heading ? (
        <div className={styles.intro}>
          <h2 id="services-title" className={styles.title}>
            The studio
          </h2>
          <p className={styles.lede}>
            The platform came out of the studio. We still build the store itself: the site, the app and the feed
            people find it through.
          </p>
        </div>
      ) : (
        <h2 id="services-title" className="sr-only">
          Services
        </h2>
      )}
      <ol className={styles.drawers}>
        {SERVICES.map((s) => (
          <Drawer
            key={s.id}
            service={s}
            open={open === s.id}
            onToggle={() => setOpen((cur) => (cur === s.id ? null : s.id))}
          />
        ))}
      </ol>
      <div className={styles.after}>
        <TransitionLink href="/contact" className={styles.cta} data-magnetic="0.2">
          Start a project
        </TransitionLink>
        <p className={styles.note}>Scoped on a call, priced in rupees, built in Hyderabad.</p>
      </div>
    </section>
  );
}
