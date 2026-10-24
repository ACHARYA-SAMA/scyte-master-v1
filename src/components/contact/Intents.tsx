"use client";

import type { ContactIntent } from "@/lib/chat/contactFlow";
import styles from "./Intents.module.css";

const CARDS: { id: ContactIntent; name: string; line: string; next: string[] }[] = [
  { id: "audit", name: "Store audit", line: "Twenty minutes on where your store leaks.", next: ["We go through your store as a shopper", "A call with screenshots", "A short written summary"] },
  { id: "project", name: "Project", line: "A website, a mobile app or social media.", next: ["A call about the brief", "A written scope", "A plan with dates"] },
  { id: "pilot", name: "Pilot", line: "Thirty days of WhatsApp recovery, measured.", next: ["Two or three playbooks", "A holdout from day one", "A review in week four"] },
];

/**
 * K1, three ways in, as cards that turn over to show what happens next. Picking one
 * rewrites the chat's opening and fills the form's first field.
 */
export function Intents({ value, onChange }: { value: ContactIntent | null; onChange: (i: ContactIntent) => void }) {
  return (
    <div className={styles.cards} role="radiogroup" aria-label="What do you need?">
      {CARDS.map((c, i) => {
        const on = value === c.id;
        return (
          <button key={c.id} type="button" role="radio" aria-checked={on} className={styles.card} data-on={on ? "1" : undefined} onClick={() => onChange(c.id)} data-cursor="tap">
            <span className={styles.inner}>
              <span className={styles.front}>
                <span className={`${styles.n} t-hud`}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.name}>{c.name}</span>
                <span className={styles.line}>{c.line}</span>
              </span>
              <span className={styles.back} aria-hidden={!on}>
                <span className={`${styles.n} t-hud`}>What happens next</span>
                <ol>
                  {c.next.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
