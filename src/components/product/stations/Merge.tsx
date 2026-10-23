"use client";

import { useMemo, type CSSProperties } from "react";
import { identity } from "@/components/gl/scenes/identify/identity";
import { useStore } from "@/lib/store";
import { visit } from "@/lib/visit";
import styles from "./merge.module.css";

const FALLBACK = ["page_view", "product_view", "size_chart_open", "reviews_read", "add_to_cart", "checkout_started"];

/** Where the chips float while they are anonymous: a loose cloud, the same every time. */
const CLOUD = [
  [4, 10],
  [26, 2],
  [10, 34],
  [32, 26],
  [2, 60],
  [24, 52],
  [8, 82],
  [30, 76],
];

/**
 * The identity merge. Before consent, the visitor's events float as anonymous chips
 * and the profile card is locked. Tick the box and they zip, one by one, into a single
 * profile under the phone number; withdraw it (STOP) and they come apart again. The
 * chips are the events this visitor really made in the demo store above, when there
 * are any.
 */
export function Merge({ when }: { when: string | null }) {
  const consent = useStore(identity, (s) => s.consent);
  const stopped = useStore(identity, (s) => s.stopped);
  const verified = useStore(visit, (s) => s.verified);
  const collected = useStore(visit, (s) => s.events);
  const names = useMemo(() => {
    const seen: string[] = [];
    for (const e of collected) if (!seen.includes(e.name) && e.name !== "anonymous_id") seen.push(e.name);
    return (seen.length >= 3 ? seen : [...seen, ...FALLBACK.filter((f) => !seen.includes(f))]).slice(0, CLOUD.length);
  }, [collected]);
  const real = collected.length > 0;

  return (
    <div className={styles.merge} data-merged={consent ? "1" : undefined} aria-live="polite">
      <svg className={styles.zip} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {names.map((n, i) => {
          const ty = 9 + i * 11;
          // from the chip's place in the column to the card's edge
          return <path key={n} d={`M 52 ${ty} C 56 ${ty}, 56 40, 60.5 ${30 + i * 4}`} pathLength={1} style={{ "--d": `${i * 70 + 300}ms` } as CSSProperties} />;
        })}
      </svg>
      <ul className={styles.chips} aria-label={consent ? "Events merged into the profile" : "Anonymous events"}>
        {names.map((n, i) => {
          const [x, y] = CLOUD[i]!;
          return (
            <li
              key={n}
              className={styles.chip}
              style={{ "--x": `${x}%`, "--y": `${y}%`, "--ty": `${4 + i * 11}%`, "--d": `${i * 70}ms` } as CSSProperties}
            >
              <span className={styles.chipName}>{n}</span>
              <span className={`${styles.chipId} t-hud`}>{consent ? "linked" : "a91f-3c"}</span>
            </li>
          );
        })}
      </ul>
      <div className={styles.card}>
        <span className={`${styles.cardLabel} t-hud`}>{consent ? "One profile" : stopped ? "Consent withdrawn" : "Locked"}</span>
        <span className={`${styles.phone} t-fig`}>+91 98••• ••210</span>
        <dl className={styles.facts}>
          <div>
            <dt className="t-hud">Number</dt>
            <dd>{verified ? "Verified by OTP" : "Not verified yet"}</dd>
          </div>
          <div>
            <dt className="t-hud">WhatsApp consent</dt>
            <dd>{consent && when ? `Given, ${when} IST` : "Not given"}</dd>
          </div>
          <div>
            <dt className="t-hud">History</dt>
            <dd>{consent ? `${names.length} events attached` : "Stays anonymous"}</dd>
          </div>
        </dl>
        <span className={styles.lock} aria-hidden />
      </div>
      <p className={`${styles.note} t-small`}>{real ? "These are the events you made in the store above." : "Use the store above and your own events appear here."}</p>
    </div>
  );
}
