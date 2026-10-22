"use client";

import { ui, useStore } from "@/lib/store";
import styles from "./Toasts.module.css";

/** Short confirmations, announced politely and gone in four seconds. */
export function Toasts() {
  const toasts = useStore(ui, (s) => s.toasts);
  return (
    <div className={styles.toasts} role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <p key={t.id} className={`${styles.toast} t-small`} data-tone={t.tone}>
          <span className={styles.mark} aria-hidden />
          {t.text}
        </p>
      ))}
    </div>
  );
}
