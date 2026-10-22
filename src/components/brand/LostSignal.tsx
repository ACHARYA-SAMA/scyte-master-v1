"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** The event this visit just produced, written the way the platform would log it. */
export function LostSignal() {
  const pathname = usePathname();
  const [at, setAt] = useState("");
  useEffect(() => {
    setAt(new Date().toISOString().replace("T", " ").slice(0, 19));
  }, []);
  return (
    <pre
      style={{
        margin: 0,
        fontFamily: "var(--font-mono)",
        fontVariationSettings: '"wdth" 82',
        fontSize: "var(--step--2)",
        lineHeight: 1.6,
        color: "var(--bone-dim)",
        whiteSpace: "pre-wrap",
      }}
    >
      {`page_view {path: "${pathname}", status: 404}\n`}
      {`intent_score unchanged\n`}
      {`message_sent none, by design${at ? `\n${at} UTC` : ""}`}
    </pre>
  );
}
