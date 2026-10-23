"use client";

import { useId } from "react";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import styles from "./ToggleSwitch.module.css";

type Props = {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  /** what the two throws mean, shown either side */
  offLabel?: string;
  onLabel?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * A bat-handle toggle, the kind on an instrument panel: it throws with a little
 * overshoot, clicks, and its lamp says which way it is. A real switch for assistive
 * technology (role="switch"), operated with Space or Enter.
 */
export function ToggleSwitch({ label, checked, onChange, offLabel = "Off", onLabel = "On", disabled, className }: Props) {
  const id = useId();
  const flip = () => {
    if (disabled) return;
    onChange(!checked);
    sfx.relay();
    haptic(8);
  };
  return (
    <div className={`${styles.toggle} ${className ?? ""}`} data-on={checked ? "1" : undefined} data-disabled={disabled ? "1" : undefined}>
      <span id={`${id}-l`} className={`${styles.label} t-hud`}>
        {label}
      </span>
      <div className={styles.row}>
        <span className={`${styles.side} t-hud`} data-active={!checked ? "1" : undefined} aria-hidden>
          {offLabel}
        </span>
        <button type="button" role="switch" aria-checked={checked} aria-labelledby={`${id}-l`} className={styles.body} onClick={flip} disabled={disabled} data-cursor="tap">
          <span className={styles.bezel} aria-hidden />
          <span className={styles.bat} aria-hidden />
          <span className={styles.lamp} aria-hidden />
        </button>
        <span className={`${styles.side} t-hud`} data-active={checked ? "1" : undefined} aria-hidden>
          {onLabel}
        </span>
      </div>
    </div>
  );
}
