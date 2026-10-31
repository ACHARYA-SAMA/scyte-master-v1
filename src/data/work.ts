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
    what: "A store is a door. It stands as a gate of light on still water at dawn, shoppers pour through it as drops of light, and scrolling flies the camera through it and down the pipe with them.",
    how: "One camera path runs through three sets, joined by cuts hidden in bursts of light. Each drop's place on its river comes from the clock, so a few thousand cost one draw call. Water, sky and haze are shaders, so it holds its frame rate on integrated graphics.",
  },
  {
    id: "reasons",
    title: "Reason codes",
    page: "Home",
    href: "/",
    img: "/work/this-site/reasons.webp",
    what: "At the payment fork, light leaks through cracks labelled with the gateway's reason codes. As the camera rises, the matching playbooks seal them in gold and the fallen light runs back in.",
    how: "The falling light is one point cloud on a clock the scene can run backwards. It is a picture of the idea, not a measurement of any store, and the figures that follow are labelled illustrative.",
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
