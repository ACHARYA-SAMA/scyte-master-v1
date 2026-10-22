/** The phone's own icon set: drawn for this site, no third-party marks. 1.5 px strokes. */

type P = { className?: string };

export const Back = ({ className }: P) => (
  <svg viewBox="0 0 20 20" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12.5 4 6.5 10l6 6" />
  </svg>
);

export const Dots = ({ className }: P) => (
  <svg viewBox="0 0 20 20" className={className} aria-hidden fill="currentColor">
    <rect x="8.75" y="3" width="2.5" height="2.5" />
    <rect x="8.75" y="8.75" width="2.5" height="2.5" />
    <rect x="8.75" y="14.5" width="2.5" height="2.5" />
  </svg>
);

export const Send = ({ className }: P) => (
  <svg viewBox="0 0 20 20" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M3 10h13M11 5l5 5-5 5" />
  </svg>
);

/** One tick: sent. Two: delivered. Two, lit: read. */
export const Ticks = ({ n, className }: P & { n: 1 | 2 | 3 }) => (
  <svg viewBox="0 0 22 12" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" data-read={n === 3 ? "1" : undefined}>
    <path d="M1.5 6.5 5 10l6-7.5" />
    {n > 1 ? <path d="M9.5 9.2 10.3 10l6-7.5" /> : null}
  </svg>
);

export const Signal = ({ className }: P) => (
  <svg viewBox="0 0 18 12" className={className} aria-hidden fill="currentColor">
    <rect x="0" y="8" width="3" height="4" />
    <rect x="5" y="5.5" width="3" height="6.5" />
    <rect x="10" y="3" width="3" height="9" />
    <rect x="15" y="0" width="3" height="12" opacity="0.4" />
  </svg>
);

export const Battery = ({ className }: P) => (
  <svg viewBox="0 0 26 12" className={className} aria-hidden fill="none" stroke="currentColor">
    <rect x="0.5" y="0.5" width="22" height="11" rx="2" />
    <rect x="2.5" y="2.5" width="14" height="7" fill="currentColor" stroke="none" />
    <path d="M24.5 4v4" strokeWidth="1.5" />
  </svg>
);

export const Arrow = ({ className }: P) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
  </svg>
);

export const Check = ({ className }: P) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 8.5 6.5 12 13 4.5" />
  </svg>
);
