"use client";

import { useState } from "react";
import { SITE } from "@/config/site";
import { toast } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import styles from "./CopyEmail.module.css";

/** The studio's email as a button that copies it, with a mailto link as the fallback. */
export function CopyEmail({ className, big = false }: { className?: string; big?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SITE.email);
      setCopied(true);
      sfx.ok();
      haptic(10);
      toast(`Copied ${SITE.email}`, "ok");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${SITE.email}`;
    }
  };
  return (
    <span className={`${styles.wrap} ${big ? styles.big : ""} ${className ?? ""}`}>
      <button type="button" className={styles.copy} onClick={copy} data-cursor="tap" data-cursor-label={copied ? "Copied" : "Copy"}>
        <span className={styles.address}>{SITE.email}</span>
        <span className={`${styles.state} t-hud`} aria-live="polite">
          {copied ? "Copied" : "Copy"}
        </span>
      </button>
      <a className="sr-only" href={`mailto:${SITE.email}`}>
        Write to {SITE.email}
      </a>
    </span>
  );
}
