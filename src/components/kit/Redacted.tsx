import styles from "./Redacted.module.css";

/**
 * A field that is not filled in yet, as a deliberate part of the dossier: a redaction
 * bar the width of what will go there, which reads "Clearance pending" when pointed at
 * or focused. Screen readers hear what is missing in plain words. When the real value
 * arrives, the caller simply renders it instead.
 */
export function Redacted({ what, chars = 10, className }: { what: string; chars?: number; className?: string }) {
  return (
    <span className={`${styles.bar} ${className ?? ""}`} style={{ "--ch": chars } as React.CSSProperties} tabIndex={0} data-cursor="view" data-cursor-label="Clearance pending">
      <span className={styles.ink} aria-hidden />
      <span className={styles.note} aria-hidden>
        Clearance pending
      </span>
      <span className="sr-only">{what}: not listed yet</span>
    </span>
  );
}
