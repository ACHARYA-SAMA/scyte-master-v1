import { LOGO_PATH, LOGO_VIEWBOX } from "@/lib/logo/geometry";

type LogoProps = {
  className?: string;
  /** Accessible name. Pass null when the logo sits inside a labelled link. */
  title?: string | null;
  style?: React.CSSProperties;
};

/**
 * The exact Scyte wordmark, traced from the original raster. Colour comes from
 * `currentColor`. Never redraw, restyle the letterforms, stroke or shadow it.
 */
export function Logo({ className, title = "Scyte", style }: LogoProps) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={className}
      style={style}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      overflow="visible"
    >
      {title ? <title>{title}</title> : null}
      <path d={LOGO_PATH} />
    </svg>
  );
}
