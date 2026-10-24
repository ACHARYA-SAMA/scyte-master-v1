/**
 * Case studies. Client work is empty on purpose: no project is listed until Scyte
 * supplies a real one with permission to show it. Add an object to WORK and the
 * archive strip, the case page (/work/<slug>), the sitemap and the open-slot count all
 * pick it up.
 *
 * Example:
 * {
 *   slug: "brand-name",
 *   client: "Brand Name",
 *   title: "A storefront that loads in under two seconds on 4G",
 *   year: "2026",
 *   services: ["Website", "Social media"],
 *   cover: "/work/brand-name/cover.webp",   // 1280 x 800, 16:10
 *   summary: "One or two lines on what changed.",
 *   sections: [{ heading: "The problem", body: "..." }, { heading: "What we built", body: "..." }],
 *   results: [{ label: "Measured how", value: "..." }],   // only verified numbers
 *   url: "https://brand.example",
 * }
 */

export type Service = "Website" | "Mobile apps" | "Social media" | "Platform";

export type WorkItem = {
  slug: string;
  client: string;
  title: string;
  year: string;
  services: Service[];
  cover: string;
  summary: string;
  sections: { heading: string; body: string }[];
  results: { label: string; value: string }[];
  url?: string;
};

export const WORK: WorkItem[] = [];

/**
 * Case 00 is the site itself: the one piece of Scyte's work that can be shown without
 * anyone's permission. Each scene is a real screenshot of this site (scripts in
 * docs/tooling.md re-shoot them), and links to the live scene.
 */
export type SiteScene = {
  id: string;
  title: string;
  page: string;
  href: string;
  img: string;
  what: string;
  how: string;
};

export const THIS_SITE_SCENES: SiteScene[] = [
  {
    id: "leak",
    title: "The leak",
    page: "Home",
    href: "/",
    img: "/work/this-site/leak.webp",
    what: "The logo is the store. Each visit is a drop of light running through its letters, and the failed ones fall out.",
    how: "The letters are glass, extruded from the logo's own SVG paths. The drops run through pipes along their centre lines, on the same clock as the scroll.",
  },
  {
    id: "reasons",
    title: "Reason codes",
    page: "Home",
    href: "/",
    img: "/work/this-site/reasons.webp",
    what: "Every leak carries the payment gateway's reason. Press and hold a crack to clamp it and watch the count change.",
    how: "A live simulation in which one payment in three fails, so the leaks are easy to see. The page says so, and labels its figures illustrative.",
  },
  {
    id: "gate",
    title: "The gate",
    page: "Product",
    href: "/product#identify",
    img: "/work/this-site/gate.webp",
    what: "Consent as a physical turnstile. Events pile up against it until the shopper ticks the box.",
    how: "Rigid-body physics (Rapier) for the tokens; the checkbox on the page is the only thing that opens the gate.",
  },
  {
    id: "rules",
    title: "The patch bay",
    page: "Product",
    href: "/product#decide",
    img: "/work/this-site/rules.webp",
    what: "The rules as modules in a rack, patched with cables. Send an event through and watch the order it takes.",
    how: "Consent and suppression are welded in, so no patch can route around them. The rest can be re-patched or bypassed. The values are examples and say so.",
  },
  {
    id: "send",
    title: "The phone wall",
    page: "Product",
    href: "/product#send",
    img: "/work/this-site/send.webp",
    what: "Five working phones on a curved wall, each running a different message. Turn the wall, pick one up and answer it.",
    how: "One chat engine drives every phone on the site, with typing delays, read ticks and quick replies.",
  },
  {
    id: "assembly",
    title: "The assembly",
    page: "Studio",
    href: "/studio#assembly",
    img: "/work/this-site/assembly.webp",
    what: "Six layers of a real build, added one at a time as you scroll, then collapsed into the finished page.",
    how: "Each layer is drawn to a canvas texture at load, so the scene ships no images.",
  },
  {
    id: "scan",
    title: "The scan",
    page: "Team",
    href: "/team",
    img: "/work/this-site/scan.webp",
    what: "A hologram reads each person on the team. Point at a portrait and the HUD locks on.",
    how: "The team is one data file. Photos, when they arrive, become a depth hologram through one script.",
  },
  {
    id: "chat",
    title: "The conversation",
    page: "Contact",
    href: "/contact",
    img: "/work/this-site/chat.webp",
    what: "Contact as a chat that fills the real form under it, answer by answer.",
    how: "The form works on its own without JavaScript. The chat checks answers with the form's own rules.",
  },
];

/** Work Scyte takes on, shown as open slots until a client case fills each one. */
export type OpenSlot = { id: "website" | "apps" | "social"; title: string; service: Service; href: string; what: string };

export const OPEN_SLOTS: OpenSlot[] = [
  { id: "website", title: "Your website", service: "Website", href: "/contact?service=website", what: "A storefront that loads before shoppers lose interest." },
  { id: "apps", title: "Your app", service: "Mobile apps", href: "/contact?service=apps", what: "Your brand on the home screen, not in a forgotten tab." },
  { id: "social", title: "Your social media", service: "Social media", href: "/contact?service=social", what: "Something worth stopping for, every day." },
];

export const THIS_SITE = {
  slug: "this-site",
  title: "This site",
  year: "2026",
  summary: "The site you are on, designed and built in-house: eight interactive scenes on one WebGL canvas, one variable typeface, and no trackers.",
  stack: ["Next.js", "React Three Fiber", "GSAP", "Lenis", "Rapier"],
};
