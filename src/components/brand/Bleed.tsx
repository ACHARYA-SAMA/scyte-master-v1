import styles from "./Bleed.module.css";

/**
 * A page's chapter name, set enormous behind its opening screen in the surface tone:
 * it drifts on its own and slides with the scroll (data-parallax). Decorative, so it
 * is hidden from assistive technology. The parent needs position: relative.
 */
export function Bleed({ children, className }: { children: string; className?: string }) {
  return (
    <p className={`${styles.bleed} ${className ?? ""}`} aria-hidden data-parallax="-0.35">
      <span>{children}</span>
    </p>
  );
}
