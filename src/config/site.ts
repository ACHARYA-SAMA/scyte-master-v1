/**
 * Site-wide configuration. Rename the product in one line here.
 */

export const PRODUCT_NAME = "[BRAND NAME]";
/** Flip to true once the client confirms the name; until then no page prints it. */
export const PRODUCT_NAME_FINAL = false;
/** What the product is, for titles and cards while the name is open. */
export const PRODUCT_LABEL = "WhatsApp recovery for online stores";
/** The product as public copy may call it: its name once final, a description before. */
export const productName = (fallback = "a WhatsApp recovery platform") => (PRODUCT_NAME_FINAL ? PRODUCT_NAME : fallback);

/**
 * Contact channels that exist only once the client supplies them. With no number,
 * no WhatsApp button renders; with no hours, no "likely online" dial renders.
 */
export const WHATSAPP_NUMBER: string | null = null;
/** Office hours in Hyderabad time, 24 h, e.g. { from: 10, to: 19, days: [1, 2, 3, 4, 5, 6] } (0 is Sunday) */
export const OFFICE_HOURS: { from: number; to: number; days: number[] } | null = null;

/**
 * Plan prices are proposals still being validated with pilot partners. They print only
 * when this is true and a price is set; otherwise the page says "Pricing with your pilot".
 */
export const SHOW_PRICING = false;
export const PLAN_PRICES: Record<string, string | null> = { launch: null, growth: null, scale: null };

/**
 * Information architecture switch. "studio" keeps Scyte as the umbrella brand with the
 * WhatsApp platform as its flagship product (current). "product" turns the home page
 * into the product page and moves studio services to /services only.
 */
export const SITE_MODE: "studio" | "product" = "studio";

export const SITE = {
  name: "Scyte",
  legalName: "Scyte",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://scyte.vercel.app",
  title: "Scyte, a web and app studio in Hyderabad",
  description:
    "Scyte builds websites, mobile apps and social media for brands, and is building a consent-first WhatsApp recovery platform for online stores.",
  email: "scytehq@gmail.com",
  city: "Hyderabad",
  country: "India",
  coordinates: { lat: 17.385, lon: 78.4867 },
  socials: {
    instagram: "https://www.instagram.com/scyte.in/",
    /**
     * FLAG FOR THE CLIENT: inherited from the original site and contains "undefined".
     * Replace with the real company page before launch.
     */
    linkedin: "https://www.linkedin.com/in/scyte-undefined-056131412/",
  },
} as const;

/**
 * Every page, in story order. `chapter` is the page's name inside the story; the menu,
 * the route wipe and the command palette all read from here.
 */
export const ROUTES = [
  { href: "/", label: "Home", chapter: "The Leak", blurb: "Where a store loses shoppers it never knew it had, and one recovery, start to finish." },
  { href: "/product", label: "Product", chapter: "The Machine", blurb: "Six stations from a page view to proof: collect, identify, understand, decide, send, measure." },
  { href: "/studio", label: "Studio", chapter: "The Assembly", blurb: "Websites, mobile apps and social media, designed and built in Hyderabad." },
  { href: "/work", label: "Work", chapter: "The Archive", blurb: "Case 00 is this site, scene by scene. Client cases go up as they are signed off." },
  { href: "/team", label: "Team", chapter: "The Scan", blurb: "The people who build the machine." },
  { href: "/contact", label: "Contact", chapter: "The Conversation", blurb: "Talk to us the way your customers will talk to you." },
] as const;

export type RouteHref = (typeof ROUTES)[number]["href"];

export const NAV = ROUTES.filter((r) => r.href !== "/").map((r, i) => ({ ...r, index: String(i + 1).padStart(2, "0") }));

export const routeFor = (path: string) =>
  ROUTES.find((r) => (r.href === "/" ? path === "/" : path === r.href || path.startsWith(r.href + "/")));

/**
 * Facts that change often. They are used for internal modelling only and are NOT
 * printed as fact in public copy. Verify against the source before publishing any of
 * them (see the report, sections 8 and 10).
 */
export const VERIFY_BEFORE_PUBLISHING = {
  whatsappRates: {
    marketingInr: 0.86,
    utilityInr: 0.115,
    reportedFor: "January 2026",
    source: "Business report, section 8 (Meta can update pricing quarterly)",
    publish: false,
  },
  dpdp: {
    rulesNotified: "November 2025",
    consentManagerFrom: "13 November 2026",
    mainObligationsFrom: "13 May 2027",
    source: "Business report, section 10 (per published summaries)",
    publish: false,
  },
} as const;
