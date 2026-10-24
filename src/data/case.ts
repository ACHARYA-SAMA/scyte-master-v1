/**
 * Case 00's making-of: the briefs, the system, the code and the credits. Quotes are
 * from the briefs as written; edit or remove any of them here and the page follows.
 */

export type RoundId = "r0" | "r1" | "r2" | "r3" | "r4";

/** One redline: a phrase from the brief, circled, and what was decided because of it. */
export type Redline = { phrase: string; decision: string };

export type Brief = {
  id: Exclude<RoundId, "r0">;
  label: string;
  date: string;
  /** the brief's own headline, or the verdict that opened the round */
  quote: string;
  /** a second line from the same brief, for the margin */
  aside?: string;
  redlines: Redline[];
};

export const BRIEFS: Brief[] = [
  {
    id: "r1",
    label: "Round 1",
    date: "22 Oct",
    quote: "The logo stays the logo. It must be crazy and it must work.",
    aside: "We are not generating a template. We are making a piece of work with a point of view.",
    redlines: [
      { phrase: "The logo stays the logo.", decision: "Traced the PNG to an SVG and diffed it against the original: 0.25 % of pixels differ, inside a 0.5 % budget. Every animation ends on that shape." },
      { phrase: "crazy", decision: "One WebGL canvas for the whole site, so a scene never waits for a new context." },
      { phrase: "it must work.", decision: "A mid-range phone is the test device. Each scene measures itself and drops quality before it drops frames." },
    ],
  },
  {
    id: "r2",
    label: "Round 2",
    date: "23 Oct",
    quote: "It looks like AI slop, it is empty, it is not interactive, and it uses too many fonts.",
    aside: "Treat v1 as a rough draft to be demolished wherever it is weak.",
    redlines: [
      { phrase: "AI slop", decision: "No gradients, no glass cards, no stock pictures. The look comes from the logo: glass letters, light as the only colour that moves." },
      { phrase: "not interactive", decision: "Every phone on the site runs one chat engine. You can answer it." },
      { phrase: "too many fonts.", decision: "One family, Archivo, with its weight and width axes. Subset to the characters used: 58 KB." },
    ],
  },
  {
    id: "r3",
    label: "Round 3",
    date: "23 Oct",
    quote: "Every page must match the home page, then go 100x past it.",
    aside: "Colour is free, shape is not.",
    redlines: [
      { phrase: "match the home page", decision: "A written plan of set pieces per page, each with its own technique, so no two feel alike." },
      { phrase: "100x", decision: "Minimums before a page counted as done: ten set pieces on Product, eight on Studio, seven on Work." },
      { phrase: "Colour is free, shape is not.", decision: "The logo may be sliced, filled or thrown, as long as it comes to rest as the exact mark." },
    ],
  },
  {
    id: "r4",
    label: "Round 4",
    date: "24 Oct",
    quote: "Navigating between pages is hard, the home finale looks blurry, and the MacBook mockup is wrong.",
    aside: "Fix every bug at its root.",
    redlines: [
      { phrase: "Navigating between pages is hard", decision: "The Junction: six paths at the end of every page. Scroll towards one and you go there." },
      { phrase: "looks blurry", decision: "The finale camera is solved to face the logo square on, and bloom only touches what is brighter than full white." },
      { phrase: "the MacBook mockup is wrong.", decision: "A laptop at a standard 16:10 size, with a screen you can scroll." },
    ],
  },
];

/** Code shown next to each scene, read from the source at build time so it cannot drift. */
export type Excerpt = { file: string; at: string; before?: number; lines: number };

export const EXCERPTS: Record<string, Excerpt> = {
  leak: { file: "src/components/gl/scenes/home/Plumbing.tsx", at: "/** A square duct along each segment of a path", lines: 18 },
  reasons: { file: "src/components/gl/scenes/home/Drops.tsx", at: "// the failing arm: leak at this drop's crack", lines: 8 },
  gate: { file: "src/components/gl/scenes/identify/IdentifyScene.tsx", at: "if (s.consent) angle.current += dt * 1.6;", before: 3, lines: 12 },
  rules: { file: "src/components/product/decide/patch.ts", at: "The patch bay's logic.", before: 1, lines: 7 },
  send: { file: "src/lib/chat/useChat.ts", at: "next.bot.forEach((body, i) => {", lines: 10 },
  assembly: { file: "src/components/gl/scenes/assembly/layers.ts", at: "export const drawLayer = ", lines: 8 },
  scan: { file: "src/components/gl/scenes/team/TeamScene.tsx", at: "vertexShader: /* glsl */ `", lines: 11 },
  chat: { file: "src/lib/contact-schema.ts", at: "/** The store address check, for the chat", lines: 7 },
};

/** The ingredients, with links to where each one lives. */
export type Credit = { role: string; name: string; by: string; href: string };

export const CREDITS: Credit[] = [
  { role: "Typeface", name: "Archivo", by: "Omnibus-Type", href: "https://fonts.google.com/specimen/Archivo" },
  { role: "3D", name: "three.js", by: "Ricardo Cabello and contributors", href: "https://threejs.org" },
  { role: "3D in React", name: "React Three Fiber", by: "Poimandres", href: "https://r3f.docs.pmnd.rs" },
  { role: "3D helpers", name: "drei", by: "Poimandres", href: "https://github.com/pmndrs/drei" },
  { role: "Post-processing", name: "postprocessing", by: "Raoul van Rüschen", href: "https://github.com/pmndrs/postprocessing" },
  { role: "Physics", name: "Rapier", by: "Dimforge", href: "https://rapier.rs" },
  { role: "Motion", name: "GSAP", by: "GreenSock", href: "https://gsap.com" },
  { role: "Scroll", name: "Lenis", by: "darkroom.engineering", href: "https://lenis.darkroom.engineering" },
  { role: "Framework", name: "Next.js", by: "Vercel", href: "https://nextjs.org" },
  { role: "Interface", name: "React", by: "Meta and contributors", href: "https://react.dev" },
  { role: "Validation", name: "Zod", by: "Colin McDonnell and contributors", href: "https://zod.dev" },
  { role: "Testing", name: "Playwright", by: "Microsoft", href: "https://playwright.dev" },
  { role: "Design and build", name: "Scyte", by: "Hyderabad", href: "/team" },
];

/** What each round's timelapse frames are. Frames are real captures of that round's last commit. */
export const ROUND_NOTES: Record<RoundId, string> = {
  r0: "The site as it was handed over",
  r1: "Round 1, the first build",
  r2: "Round 2, rebuilt from the ground",
  r3: "Round 3, set pieces begin",
  r4: "Round 4, now",
};
