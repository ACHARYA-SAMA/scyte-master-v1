"use client";

import { SceneSection } from "@/components/gl/SceneSection";
import { playlogo } from "@/components/gl/scenes/playlogo/playlogo";
import { useStore } from "@/lib/store";
import styles from "./PlayLogo.module.css";

/**
 * K7, the last thing before the Junction: the name, to play with. The letters are the
 * exact outlines, extruded; at rest they are the logo, and they always go back.
 */
export function PlayLogo() {
  const mode = useStore(playlogo, (s) => s.mode);
  const throws = useStore(playlogo, (s) => s.throws);
  return (
    <SceneSection scene="playlogo" className={styles.section} aria-labelledby="play-title">
      <div className={styles.copy}>
        <p className={`${styles.kicker} t-hud`}>Before you go</p>
        <h2 id="play-title" className={styles.title}>
          Play with the name.
        </h2>
        <p className={styles.lede}>Grab a letter and throw it. Stack them. Leave them alone for four seconds and they go back where they belong.</p>
      </div>
      <div className={styles.controls}>
        <button type="button" className={styles.btn} onClick={() => playlogo.set((s) => ({ knock: s.knock + 1 }))} data-cursor="tap">
          Knock it over
        </button>
        <button type="button" className={styles.btn} onClick={() => playlogo.set((s) => ({ reset: s.reset + 1 }))} disabled={mode !== "free"} data-cursor="tap">
          Put it back
        </button>
        <p className={`${styles.state} t-hud`} aria-live="polite">
          {mode === "home" ? "The logo, at rest" : mode === "returning" ? "Going home" : `In play. Throws: ${throws}`}
        </p>
      </div>
    </SceneSection>
  );
}
