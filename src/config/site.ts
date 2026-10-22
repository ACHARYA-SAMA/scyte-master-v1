/**
 * Site-wide configuration. Rename the product in one line here.
 */

export const PRODUCT_NAME = "[BRAND NAME]";

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
    linkedin: "https://www.linkedin.com/in/scyte-undefined-056131412/",
  },
} as const;

export const NAV = [
  { href: "/product", label: "Product", index: "01" },
  { href: "/services", label: "Studio", index: "02" },
  { href: "/work", label: "Work", index: "03" },
  { href: "/team", label: "Team", index: "04" },
  { href: "/contact", label: "Contact", index: "05" },
] as const;

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
