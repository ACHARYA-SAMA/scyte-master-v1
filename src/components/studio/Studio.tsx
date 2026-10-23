"use client";

import { useMemo, useRef } from "react";
import { useChapters } from "@/components/shell/chapters";
import { TransitionLink } from "@/components/transition/navigation";
import { PhoneFrame } from "@/components/devices/PhoneFrame";
import { SERVICES } from "@/data/services";
import { useRunningLight } from "@/lib/useRunningLight";
import { Assembly } from "./Assembly";
import { WebsiteBench } from "./WebsiteBench";
import { AppPrototype } from "./AppPrototype";
import { SocialBench } from "./SocialBench";
import { HowWeWork } from "./HowWeWork";
import styles from "./studio.module.css";
import bench from "./bench.module.css";

const BENCH_COPY = {
  website: { n: "01", title: "Websites", line: "Change the type, the colour and the motion of a live page. This is the kind of control we hand over." },
  apps: { n: "02", title: "Mobile apps", line: "A working prototype: tabs, a list you can pull to refresh, a product page that slides in, a cart that counts." },
  social: { n: "03", title: "Social media", line: "A month of posts, planned before they are made, made before they are due. Drag the month and watch it go out." },
} as const;

/** The Assembly: what Scyte makes, said plainly, then shown. */
export function Studio() {
  const services = useRef<HTMLOListElement>(null);
  // the three services take turns, like work moving through the studio
  useRunningLight(services, 2200);
  useChapters(
    useMemo(
      () => [
        { id: "top", label: "What we do", target: "studio-top" },
        { id: "assembly", label: "The assembly", target: "assembly" },
        { id: "website", label: "Websites", target: "bench-website" },
        { id: "apps", label: "Mobile apps", target: "bench-apps" },
        { id: "social", label: "Social media", target: "bench-social" },
        { id: "process", label: "How we work", target: "process" },
        { id: "deliverables", label: "What you get", target: "deliverables" },
      ],
      [],
    ),
  );

  return (
    <>
      <header className={styles.hero} id="studio-top">
        <p className="t-hud c-khaki">The studio</p>
        <h1 className={styles.title}>Scyte designs and builds websites, mobile apps and social media for brands. We work from Hyderabad.</h1>
        <ol ref={services} className={styles.services}>
          {SERVICES.map((s, i) => (
            <li key={s.id}>
              <a href={`#bench-${s.id}`} className={styles.service} data-cursor="open">
                <span className={`${styles.sn} t-hud`}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.sName}>{s.name}</span>
                <span className={styles.sLine}>{s.line}</span>
              </a>
            </li>
          ))}
        </ol>
      </header>

      <Assembly />

      <section className={styles.benches} aria-labelledby="benches-title">
        <header className={styles.benchesHead}>
          <h2 id="benches-title" className={styles.h2}>
            Three workbenches. Use them.
          </h2>
          <p className={styles.lede}>Every control below is live. The demo store is fictional; the work it stands for is ours.</p>
        </header>

        {(["website", "apps", "social"] as const).map((id) => (
          <article key={id} id={`bench-${id}`} className={styles.benchBlock} aria-labelledby={`bench-${id}-title`}>
            <header className={styles.benchHead}>
              <span className={styles.bn}>{BENCH_COPY[id].n}</span>
              <h3 id={`bench-${id}-title`} className={styles.h3}>
                {BENCH_COPY[id].title}
              </h3>
              <p className={styles.benchLine}>{BENCH_COPY[id].line}</p>
            </header>
            {id === "website" ? <WebsiteBench /> : null}
            {id === "apps" ? (
              <div className={bench.bench} id="apps">
                <div className={bench.appNotes}>
                  <p className="t-hud c-muted">Try</p>
                  <ul>
                    <li>Pull the list down to refresh it</li>
                    <li>Open a product, then swipe its photos</li>
                    <li>Pick a size and add it: watch the cart badge</li>
                    <li>Change quantities in the cart</li>
                  </ul>
                  <p className="t-small c-muted">Prototype, not client work. Built the way we build: one codebase for iPhone and Android.</p>
                </div>
                <div className={bench.phoneCol}>
                  <PhoneFrame label="App prototype">
                    <AppPrototype />
                  </PhoneFrame>
                </div>
              </div>
            ) : null}
            {id === "social" ? <SocialBench /> : null}
          </article>
        ))}
      </section>

      <HowWeWork />

      <section className={`band ${styles.deliverables}`} id="deliverables" aria-labelledby="deliverables-title">
        <h2 id="deliverables-title" className={styles.dTitle}>
          What you get
        </h2>
        <div className={styles.dGrid}>
          {SERVICES.map((s) => (
            <div key={s.id} className={styles.dCol}>
              <h3 className={styles.dName}>{s.name}</h3>
              <ul>
                {s.promises.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <dl className={styles.terms}>
                <div>
                  <dt className="t-hud">Typical timeline</dt>
                  <dd>
                    <span className="fill">[CONFIRM]</span>
                  </dd>
                </div>
                <div>
                  <dt className="t-hud">From</dt>
                  <dd>
                    <span className="fill">[CONFIRM: ₹]</span>
                  </dd>
                </div>
              </dl>
              <TransitionLink href={`/contact?service=${s.id}`} className={styles.start} data-magnetic data-cursor="open">
                Start a {s.id === "apps" ? "mobile app" : s.id === "social" ? "social media" : "website"} project
              </TransitionLink>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
