import assets from "./team-assets.json";

/**
 * The team. Adding a person is two steps:
 *   1. drop a portrait at public/team/<slug>.jpg (or .webp / .png) and run
 *      `npm run team:assets` (thumbnail, depth map, dominant colour);
 *   2. add one object to TEAM below.
 *
 * Nothing here is invented. The four seats are the roles the business report plans
 * for "now (3-4 people)" (section 12.1). Every personal field is null until the real
 * person is supplied, and null renders as a redaction bar ("Clearance pending"). Without a photo,
 * a generated silhouette is drawn; never a stock face.
 */

export type Skill = {
  label: string;
  /** 0 to 100. null renders as an unfilled gauge segment. */
  value: number | null;
};

export type Links = {
  /** drives the "Visit portfolio" action; null shows "Portfolio coming soon" */
  portfolio: string | null;
  linkedin: string | null;
  github: string | null;
  x: string | null;
  email: string | null;
};

export type Member = {
  /** URL-safe id; also the photo file name */
  slug: string;
  /** short call sign for the HUD */
  codename: string | null;
  name: string | null;
  role: string;
  /** shown giant when the name is not filled in yet */
  roleShort: string;
  location: string | null;
  /** public path; filled automatically from public/team/<slug>.* by the asset script */
  photo: string | null;
  bio: string | null;
  skills: Skill[];
  tools: string[];
  currently: string | null;
  joined: string | null;
  links: Links;
};

const NO_LINKS: Links = { portfolio: null, linkedin: null, github: null, x: null, email: null };

const seat = (slug: string, roleShort: string, role: string, skillLabels: string[], tools: string[]): Member => ({
  slug,
  codename: null,
  name: null,
  role,
  roleShort,
  location: null,
  photo: null,
  bio: null,
  skills: skillLabels.map((label) => ({ label, value: null })),
  tools,
  currently: null,
  joined: null,
  links: NO_LINKS,
});

const SEATS: Member[] = [
  seat("technical-lead", "Tech lead", "Technical lead: backend, event pipeline, WhatsApp integration", ["Backend", "Pipelines", "WhatsApp API", "Data", "Infra"], [
    "TypeScript",
    "Postgres",
    "ClickHouse",
    "Redis",
  ]),
  seat("full-stack", "Full stack", "Full-stack and frontend: SDK, Shopify app, dashboard", ["Frontend", "SDK", "Shopify", "Dashboards", "Motion"], [
    "Next.js",
    "React",
    "Shopify CLI",
  ]),
  seat("product-sales", "Product", "Product and sales: customer calls, onboarding, pricing", ["Discovery", "Sales", "Onboarding", "Pricing", "Ops"], [
    "Calls",
    "Store audits",
    "Spreadsheets",
  ]),
  seat("design-copy", "Design", "Designer and template copywriter (part time)", ["Interface", "Brand", "Templates", "Copy", "Hindi and Telugu"], [
    "Figma",
    "Type",
    "WhatsApp templates",
  ]),
];

type Asset = { photo: string; thumb: string; depth: string; color: string; face: [number, number] };
const ASSETS = assets as Record<string, Asset>;

/** The team, with any processed photo attached. */
export const TEAM: Member[] = SEATS.map((m) => ({ ...m, photo: m.photo ?? ASSETS[m.slug]?.photo ?? null }));

export const assetsFor = (slug: string): Asset | null => ASSETS[slug] ?? null;

export const displayName = (m: Member) => m.name ?? m.roleShort;

/** Deterministic hex id from the slug, so it never changes between renders. */
export const hexId = (slug: string) => {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) h = Math.imul(h ^ slug.charCodeAt(i), 16777619);
  return "0x" + (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
};
