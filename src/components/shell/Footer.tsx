"use client";

import { usePathname } from "next/navigation";
import { ReactiveLogo } from "@/components/brand/ReactiveLogo";
import { TransitionLink } from "@/components/transition/navigation";
import { useStore } from "@/lib/store";
import { visit } from "@/lib/telemetry";
import { SITE } from "@/config/site";
import styles from "./Footer.module.css";

const fmtDuration = (ms: number) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
};

function VisitReadout() {
  const events = useStore(visit, (v) => v.events);
  const engaged = useStore(visit, (v) => v.engagedMs);
  const pages = useStore(visit, (v) => v.pages.length);
  return (
    <p className={styles.visit}>
      This visit so far: <strong className="t-num">{events}</strong> events,{" "}
      <strong className="t-num">{fmtDuration(engaged)}</strong> engaged, <strong className="t-num">{pages}</strong>{" "}
      {pages === 1 ? "page" : "pages"}. Counted in your browser the way our platform counts a store&rsquo;s shoppers, and
      sent nowhere.
    </p>
  );
}

export function Footer() {
  const pathname = usePathname();
  return (
    <footer className={styles.footer} data-route={pathname}>
      <div className={styles.top}>
        <p className={styles.closing}>
          Fewer messages.
          <br />
          Better timed.
          <br />
          Provably yours.
        </p>
        <div className={styles.contact}>
          <TransitionLink href="/contact#audit" className={styles.cta} data-magnetic="0.18">
            <span>Book a 20-minute store audit</span>
          </TransitionLink>
          <dl className={styles.facts}>
            <div>
              <dt>Write</dt>
              <dd>
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              </dd>
            </div>
            <div>
              <dt>Visit</dt>
              <dd>{SITE.city}, India</dd>
            </div>
            <div>
              <dt>Follow</dt>
              <dd className={styles.socials}>
                <a href={SITE.socials.instagram} target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
                <a href={SITE.socials.linkedin} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <ReactiveLogo className={styles.logo} assembleOnEnter strength={18} />

      <div className={styles.bottom}>
        <VisitReadout />
        <p className={styles.legal}>
          &copy; {new Date().getFullYear()} Scyte. Made in Hyderabad.
        </p>
      </div>
    </footer>
  );
}
