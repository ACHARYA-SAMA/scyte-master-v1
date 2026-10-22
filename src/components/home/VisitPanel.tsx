"use client";

import { useStore } from "@/lib/store";
import { intentScore, visit } from "@/lib/telemetry";
import styles from "./VisitPanel.module.css";

const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * The visitor's own session, scored with the report's v1 intent rules (section 7.3).
 * A live demonstration of what the product measures, on the person reading it.
 */
export function VisitPanel({ className }: { className?: string }) {
  const v = useStore(visit, (s) => s);
  const score = intentScore(v);
  const last = v.last[0];
  return (
    <aside className={`${styles.panel} ${className ?? ""}`} aria-label="Your visit, measured in this browser">
      <p className={styles.title}>Your visit, measured here</p>
      <dl className={styles.rows}>
        <div>
          <dt>Engaged time</dt>
          <dd className="t-num">{mmss(v.engagedMs)}</dd>
        </div>
        <div>
          <dt>Scroll depth</dt>
          <dd className="t-num">{String(Math.round(v.maxScroll * 100)).padStart(2, "0")}%</dd>
        </div>
        <div>
          <dt>Events</dt>
          <dd className="t-num">{v.events}</dd>
        </div>
        <div>
          <dt>Intent score</dt>
          <dd className="t-num">
            <span className={styles.meter} aria-hidden>
              {Array.from({ length: 10 }, (_, i) => (
                <i key={i} data-on={i < Math.round(score / 10) ? "1" : undefined} />
              ))}
            </span>
            {score}
          </dd>
        </div>
        <div>
          <dt>Last event</dt>
          <dd className={styles.event}>{last ? last.name : "waiting"}</dd>
        </div>
      </dl>
      <p className={styles.note}>Computed in your browser. Sent nowhere.</p>
    </aside>
  );
}
