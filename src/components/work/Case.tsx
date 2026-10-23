import { TransitionLink } from "@/components/transition/navigation";
import { OPEN_SLOTS, THIS_SITE, THIS_SITE_SCENES, type WorkItem } from "@/data/work";
import { CaseChapters } from "./CaseChapters";
import styles from "./Case.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

function Next() {
  return (
    <footer className={`${styles.next} band`}>
      <p className="t-hud">Next</p>
      <p className={styles.nextTitle}>Case 01 is open.</p>
      <div className={styles.nextLinks}>
        {OPEN_SLOTS.map((o) => (
          <TransitionLink key={o.id} href={o.href} className={`${styles.nextLink} cta`} data-cursor="tap">
            {o.service}
          </TransitionLink>
        ))}
        <TransitionLink href="/work" className={styles.back}>
          Back to the archive
        </TransitionLink>
      </div>
    </footer>
  );
}

/**
 * Case 00, the site itself: one screen per scene, each a real screenshot with what it
 * does, how it is built and a link to the live scene. Frames opened from the archive
 * land on their own scene.
 */
export function ThisSiteCase() {
  const total = THIS_SITE_SCENES.length;
  return (
    <article className={styles.case}>
      <CaseChapters chapters={[{ id: "case", label: "Case 00", target: "case-top" }, ...THIS_SITE_SCENES.map((s) => ({ id: s.id, label: s.title, target: `scene-${s.id}` }))]} />
      <header id="case-top" className={styles.head}>
        <p className="t-hud c-khaki">Case 00</p>
        <h1 className={styles.title}>{THIS_SITE.title}.</h1>
        <p className={styles.lede}>{THIS_SITE.summary}</p>
        <dl className={styles.facts}>
          <div>
            <dt className="t-hud c-muted">Year</dt>
            <dd>{THIS_SITE.year}</dd>
          </div>
          <div>
            <dt className="t-hud c-muted">Built with</dt>
            <dd>{THIS_SITE.stack.join(", ")}</dd>
          </div>
          <div>
            <dt className="t-hud c-muted">Trackers</dt>
            <dd>None. No cookies either.</dd>
          </div>
        </dl>
        <nav className={styles.index} aria-label="Scenes in this case">
          <ol>
            {THIS_SITE_SCENES.map((s, i) => (
              <li key={s.id}>
                <a href={`#scene-${s.id}`} data-cursor="view" data-cursor-label="Jump" data-tilt>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.img} alt="" width={1280} height={800} loading="lazy" decoding="async" />
                  <span>
                    <span className="t-fig c-muted">{pad(i + 1)}</span> {s.title}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      {THIS_SITE_SCENES.map((s, i) => (
        <section key={s.id} id={`scene-${s.id}`} className={styles.scene} data-side={i % 2 ? "right" : "left"} aria-labelledby={`scene-${s.id}-title`}>
          <figure className={styles.shot} data-tilt>
            {/* the archive hands this exact file over, already decoded */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-parallax="0.12" src={s.img} data-handoff={s.img} alt={`Screenshot of ${s.title.toLowerCase()}, on the ${s.page} page of this site`} width={1280} height={800} loading={i < 2 ? "eager" : "lazy"} decoding="async" />
          </figure>
          <div className={styles.text}>
            <p className={`${styles.count} t-fig`}>
              {pad(i + 1)}
              <span className="c-muted"> / {pad(total)}</span>
            </p>
            <p className="t-hud c-khaki">{s.page}</p>
            <h2 id={`scene-${s.id}-title`} className={styles.h2}>
              {s.title}
            </h2>
            <p className={styles.what}>{s.what}</p>
            <p className={styles.how}>{s.how}</p>
            <TransitionLink href={s.href} className={`${styles.live} cta`} data-cursor="open">
              See it live
            </TransitionLink>
          </div>
        </section>
      ))}

      <Next />
    </article>
  );
}

/** A client case: what changed, how it was built, and only numbers that were measured. */
export function ClientCase({ w }: { w: WorkItem }) {
  return (
    <article className={styles.case}>
      <header className={styles.head}>
        <p className="t-hud c-khaki">
          {w.year}, {w.services.join(", ")}
        </p>
        <h1 className={styles.title}>{w.client}</h1>
        <p className={styles.lede}>{w.title}</p>
      </header>
      <figure className={styles.cover}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={w.cover} data-handoff={w.cover} alt={`${w.client}: ${w.title}`} width={1280} height={800} />
      </figure>
      <div className={styles.body}>
        <p className={styles.summary}>{w.summary}</p>
        {w.sections.map((s) => (
          <section key={s.heading} className={styles.section}>
            <h2 className={styles.h3}>{s.heading}</h2>
            <p>{s.body}</p>
          </section>
        ))}
        {w.results.length ? (
          <dl className={styles.results}>
            {w.results.map((r) => (
              <div key={r.label}>
                <dt className="t-hud c-muted">{r.label}</dt>
                <dd className="t-fig">{r.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {w.url ? (
          <a href={w.url} target="_blank" rel="noopener noreferrer" className={`${styles.live} cta`}>
            Visit the live site
          </a>
        ) : null}
      </div>
      <Next />
    </article>
  );
}
