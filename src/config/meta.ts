import type { Metadata } from "next";
import { SITE } from "./site";

/**
 * A page's metadata in one call. Next replaces a parent's openGraph object rather than
 * merging it, so every page restates the whole card here; the share image itself comes
 * from the route's opengraph-image file.
 */
export const pageMeta = ({ title, description, path }: { title: string; description: string; path: string }): Metadata => {
  const full = `${title} | ${SITE.name}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE.name, locale: "en_IN", url: path, title: full, description },
    twitter: { card: "summary_large_image", title: full, description },
  };
};
