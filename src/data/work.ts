/**
 * Case studies. Empty on purpose: no project is listed until Scyte supplies a real
 * one with permission to show it. Add an object to WORK and the index, the case page
 * (/work/<slug>), the sitemap and the shared-element transition all pick it up.
 *
 * Example:
 * {
 *   slug: "brand-name",
 *   client: "Brand Name",
 *   title: "A storefront that loads in under two seconds on 4G",
 *   year: "2026",
 *   services: ["Website", "Social media"],
 *   cover: "/work/brand-name/cover.jpg",   // 1600 x 1000 or larger
 *   summary: "One or two lines on what changed.",
 *   sections: [{ heading: "The problem", body: "..." }, { heading: "What we built", body: "..." }],
 *   results: [{ label: "Measured how", value: "..." }],   // only verified numbers
 *   url: "https://brand.example",
 * }
 */

export type WorkItem = {
  slug: string;
  client: string;
  title: string;
  year: string;
  services: ("Website" | "Mobile apps" | "Social media" | "Platform")[];
  cover: string;
  summary: string;
  sections: { heading: string; body: string }[];
  results: { label: string; value: string }[];
  url?: string;
};

export const WORK: WorkItem[] = [];
