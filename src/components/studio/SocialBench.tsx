"use client";

import { useId, useRef, useState, type CSSProperties } from "react";
import { useIdleDemo } from "@/lib/useIdleDemo";
import { PhoneFrame } from "@/components/devices/PhoneFrame";
import styles from "./bench.module.css";

/** A demo month of posts for the fictional store. Not a client's calendar. */
const POSTS = [
  { day: 2, kind: "Reel", title: "How 400 gsm feels", shape: "circle" },
  { day: 5, kind: "Carousel", title: "Sizing, honestly", shape: "grid" },
  { day: 9, kind: "Post", title: "The oat hoodie", shape: "block" },
  { day: 12, kind: "Story", title: "Behind the cut table", shape: "lines" },
  { day: 16, kind: "Reel", title: "Wash test, week 3", shape: "circle" },
  { day: 19, kind: "Post", title: "Restock: size M", shape: "block" },
  { day: 23, kind: "Carousel", title: "Three ways to wear it", shape: "grid" },
  { day: 27, kind: "Post", title: "A note on fit", shape: "lines" },
];

type Status = "planned" | "designed" | "scheduled" | "published";

const statusOf = (postDay: number, today: number): Status => {
  if (today >= postDay) return "published";
  if (today >= postDay - 2) return "scheduled";
  if (today >= postDay - 5) return "designed";
  return "planned";
};

function Art({ shape, tone }: { shape: string; tone: number }) {
  const bg = ["#c2b897", "#2b3a2f", "#e6d5b8", "#334638"][tone % 4];
  const fg = tone % 4 === 1 || tone % 4 === 3 ? "#c2b897" : "#1b261d";
  return (
    <span className={styles.art} style={{ background: bg, "--fg": fg } as CSSProperties} data-shape={shape} aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * Social workbench: scrub through a month. Posts move from planned to designed to
 * scheduled to published, and the feed on the phone fills as they go out.
 */
export function SocialBench() {
  const id = useId();
  const [today, setToday] = useState(10);
  const bench = useRef<HTMLDivElement>(null);
  // the month runs on its own until someone takes the slider
  useIdleDemo(bench, () => setToday((d) => (d >= 30 ? 1 : d + 1)), 700);
  const published = POSTS.filter((p) => statusOf(p.day, today) === "published").reverse();
  return (
    <div ref={bench} className={styles.bench} id="social">
      <div className={styles.calendarWrap} data-motion-own>
        <div className={styles.scrub}>
          <label htmlFor={id} className={styles.fieldLabel}>
            <span>Drag through the month</span>
            <output htmlFor={id} className="t-fig">
              Day {today}
            </output>
          </label>
          <input
            id={id}
            type="range"
            min={1}
            max={30}
            value={today}
            onChange={(e) => setToday(Number(e.target.value))}
            style={{ "--p": `${((today - 1) / 29) * 100}%` } as CSSProperties}
            data-cursor="scrub"
          />
        </div>
        <div className={styles.calendar} role="grid" aria-label="Content calendar, demo month">
          {Array.from({ length: 35 }, (_, i) => {
            const day = i - 1;
            const post = POSTS.find((p) => p.day === day);
            const st = post ? statusOf(post.day, today) : null;
            return (
              <div key={i} role="gridcell" className={styles.day} data-past={day >= 1 && day <= 30 && day < today ? "1" : undefined} data-today={day === today ? "1" : undefined} data-out={day < 1 || day > 30 ? "1" : undefined}>
                {day >= 1 && day <= 30 ? <span className={`${styles.dayN} t-hud`}>{day}</span> : null}
                {post ? (
                  <span className={styles.chip} data-status={st}>
                    <b>{post.kind}</b>
                    <span>{post.title}</span>
                    <em className="t-hud">{st}</em>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="t-small c-muted">
          A demo calendar for the fictional store. {published.length} of {POSTS.length} posts out by day {today}.
        </p>
      </div>
      <div className={styles.phoneCol}>
        <PhoneFrame label="Demo feed">
          <div className={styles.feed} data-lenis-prevent>
            <p className={styles.feedHead}>
              <b>demostore</b>
              <span className="t-hud">Profile</span>
            </p>
            <div className={styles.feedGrid}>
              {published.length === 0 ? <p className={styles.feedEmpty}>Nothing posted yet. Drag the month forward.</p> : null}
              {published.map((p, i) => (
                <figure key={p.day} className={styles.post}>
                  <Art shape={p.shape} tone={POSTS.indexOf(p)} />
                  <figcaption>
                    <b>{p.title}</b>
                    <span className="t-hud">
                      Day {p.day}, {p.kind}
                    </span>
                  </figcaption>
                  {i === 0 && p.day === today ? <span className={`${styles.fresh} t-hud`}>Just posted</span> : null}
                </figure>
              ))}
            </div>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}
