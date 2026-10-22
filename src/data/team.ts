/**
 * The team. Adding a person is one object in TEAM.
 *
 * Nothing here is invented. The four seats below are the roles the business report
 * plans for "now (3–4 people)" (section 12.1); every personal field is null until the
 * real person is supplied, and null renders as a visible [ FILL ] state on the site.
 * Portraits: leave `photo` null to get a generated silhouette, or point it at a file
 * in /public/team/ (portrait, at least 1200 px tall, face roughly centred).
 */

export type Link = {
  kind: "linkedin" | "github" | "x" | "email" | "site";
  href: string;
  label?: string;
};

export type Skill = {
  label: string;
  /** 0 to 100. null renders as an unfilled gauge segment. */
  value: number | null;
};

export type Project = {
  name: string;
  year: string;
  note: string;
  href?: string;
};

export type Member = {
  /** URL-safe id, also seeds the HUD hex id. */
  slug: string;
  /** Short call sign shown in the HUD header. */
  codename: string | null;
  name: string | null;
  /** Shown giant when the name is not filled in yet. */
  roleShort: string;
  role: string;
  location: string | null;
  coordinates: { lat: number; lon: number } | null;
  photo: string | null;
  bio: string | null;
  skills: Skill[];
  tools: string[];
  currently: string | null;
  links: Link[];
  joined: string | null;
  status: string;
  projects: Project[];
  timeline: { year: string; event: string }[];
};

const seat = (
  slug: string,
  roleShort: string,
  role: string,
  skillLabels: string[],
  tools: string[],
): Member => ({
  slug,
  codename: null,
  name: null,
  roleShort,
  role,
  location: null,
  coordinates: null,
  photo: null,
  bio: null,
  skills: skillLabels.map((label) => ({ label, value: null })),
  tools,
  currently: null,
  links: [],
  joined: null,
  status: "Seat defined in the plan, person not yet listed",
  projects: [],
  timeline: [],
});

export const TEAM: Member[] = [
  seat(
    "technical-lead",
    "Tech lead",
    "Technical lead: backend, event pipeline, WhatsApp integration",
    ["Backend", "Pipelines", "WhatsApp API", "Data", "Infra"],
    ["TypeScript", "Postgres", "ClickHouse", "Redis"],
  ),
  seat(
    "full-stack",
    "Full stack",
    "Full-stack and frontend: SDK, Shopify app, dashboard",
    ["Frontend", "SDK", "Shopify", "Dashboards", "Motion"],
    ["Next.js", "React", "Shopify CLI"],
  ),
  seat(
    "product-sales",
    "Product",
    "Product and sales founder: customer calls, onboarding, pricing",
    ["Discovery", "Sales", "Onboarding", "Pricing", "Ops"],
    ["Calls", "Store audits", "Spreadsheets"],
  ),
  seat(
    "design-copy",
    "Design",
    "Designer and template copywriter (part time)",
    ["Interface", "Brand", "Templates", "Copy", "Hindi / Telugu"],
    ["Figma", "Type", "WhatsApp templates"],
  ),
];

export const displayName = (m: Member) => m.name ?? m.roleShort;

/** Deterministic hex id from the slug, so it never changes between renders. */
export const hexId = (slug: string) => {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) h = Math.imul(h ^ slug.charCodeAt(i), 16777619);
  return "0x" + (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
};
