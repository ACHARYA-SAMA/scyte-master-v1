"use client";

import { useEffect, useState } from "react";

/** The event this visit just produced, written the way the platform would log it. */
export function LostSignal() {
  // Read on the client only: the 404 is prerendered once, for every missing path.
  const [path, setPath] = useState("");
  const [at, setAt] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPath(window.location.pathname);
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
      {`page_view {path: "${path || "unknown"}", status: 404}\n`}
      {`intent_score unchanged\n`}
      {`message_sent none, by design${at ? `\n${at} UTC` : ""}`}
    </pre>
  );
}
