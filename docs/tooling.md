# Tooling inventory, round 2

Everything this environment offers, what each piece is for on this build, and why anything is skipped. Taken on 23 October 2026, before any round-2 code. The v1 inventory is in git history (`git show 4ab689f:docs/tooling.md`).

## Skills

| Skill | Source | Use on this build |
|---|---|---|
| `frontend-design` | Anthropic plugin | Art direction review of the token plan and each page against generic defaults. Used for the thesis. |
| `dataviz` and its palette validator | bundled | Dashboard, economics model and the Measure split-world charts. New chart series get validated against Ground and Surface before they ship. |
| `unslop` | hzblj-skills | A copy pass on every string on the site, plus the docs and commit messages. |
| `web/animations` (GSAP, CSS) | hzblj-skills | GSAP timeline, ScrollTrigger and cleanup patterns, checked against our `useGSAP` setup. |
| `web/styling`, `shared/ui`, `shared/type-safety`, `shared/clean-code` | hzblj-skills | Conventions for the component and type work. |
| `design-critique` | design plugin | The per-page critique loop (section 3 of the brief): ten flaws per round, three rounds a page. |
| `accessibility-review` | design plugin | A WCAG audit of each page before sign-off, alongside Lighthouse and keyboard walks. |
| `ux-copy` | design plugin | Microcopy: phone flows, errors, empty states, toasts, form labels. |
| `design-system` | design plugin | Documenting tokens and components once they settle. |
| `modern-web-guidance` | plugin | Current platform guidance (view transitions, scroll-driven animation, `content-visibility`, font loading) before each foundation piece. |
| `brand-review` | marketing plugin | A voice-consistency check of the final copy. |
| `seo-audit` | marketing plugin | Metadata, Open Graph, canonical and structured-data pass at the end. |
| `figma-shaders`, `figma-implement-motion`, `figma-use` | Figma plugin | Only if a Figma file becomes part of the handoff. See the Figma row below. |
| `pdf` | claude.ai | Not needed in the end. The report's text came out cleanly with PyMuPDF. |
| `built-in-browser`, `chrome-browser`, `computer-use` | claude.ai | Built-in browser for checking pages by eye. Headless Playwright is used for anything repeatable. |

**Skipped:** `21st` (UI component marketplace), because its stock components are exactly what the brief calls slop. Also `analytics-skills`, `docs`, `google-workspace`, `xlsx`, `pptx`, `docx`, `slidely`, `morning`, `import-memory`, `setup-writing-style`, `skill-creator` and `deep-research`, because none of them has a job on this site.

## Agents

| Agent | Use |
|---|---|
| `hzblj-skills:clean-code-reviewer` | A read-only review of each stage's diff before it is committed. |
| `hzblj-skills:animation-specialist` | A second opinion when a scroll sequence janks and the cause is not obvious. |
| `Explore` | Broad searches of `node_modules` type definitions when a library API is unclear. |

**Not used for building pages:** `web-developer`, `fast-worker`, `code-refactorer`, `deep-reasoner`, `mobile-developer`, `monorepo-architect`, `Plan` and `general-purpose`. Art direction has to stay in one head, and the client's v1 complaint was incoherence. Handing pages to separate agents would reintroduce it.

## MCP servers and connectors

| Server | Status | Use |
|---|---|---|
| **Figma** (official) | Authenticated: the user's student team, Full seat | `generate_image` and the Weave model runners can produce images, video and textures, but every call spends the team's Figma AI credits. All 3D lighting and materials are procedural (see the thesis), so no credits are planned. If real hero imagery is needed later, this is the tool, and it will be used only with a yes from the client. `create_shader` and `list_shaders` make Figma-native shaders, which the web build cannot use. |
| **Context7** (docs for current library versions) | In the registry, **not connected** | Would give version-matched docs for three, drei, Rapier and postprocessing. Until it is connected, the installed `.d.ts` files and Next's bundled docs (`node_modules/next/dist/docs`) are the reference. |
| Built-in browser (`Claude_Browser`) | Available | Looking at pages, network inspection |
| Claude in Chrome | Available | Not needed. The built-in browser and headless Playwright cover everything. |
| Computer use | Available | Not needed. Nothing here is a native app. |
| Terminal | Available | Long-running dev and production servers |
| `visualize` | Available | Not needed. Reports are files in `docs/`. |
| Claude Docs | Available | Not needed. The brief asks for repo files. |
| Session, PR, scheduler and sidebar tools | Available | Housekeeping only |
| Design plugin connectors (Figma, Notion, Linear, Slack and others), marketing connectors (Canva, Ahrefs, Amplitude, HubSpot and others), Slidely | **Need authorisation** | None are required. They stay off unless the client connects them. |

## Local tools

| Tool | Version | Use |
|---|---|---|
| Node.js, npm | 24.19 | Build, scripts |
| Next.js | 16.4.2 (latest stable, checked on npm) | App Router, Turbopack, server actions, metadata files, `ViewTransition` |
| three / R3F / drei | 0.186.1 / 9.8.2 / 10.7.9 | The persistent canvas, transmission glass, `Html` transform for DOM screens in 3D |
| `@react-three/postprocessing` / `postprocessing` | 3.2.2 / 6.39.5 | Bloom, depth of field, SMAA, grain, vignette (to install) |
| `@react-three/rapier` / Rapier | 2.2.0 / 0.21.0 | Physics for the consent gate's tokens, code-split to that scene (to install) |
| GSAP (ScrollTrigger, SplitText, ScrambleText, CustomEase), Lenis, Motion | 3.15.0, 1.3.27, 14.6.0 | Scroll, timelines, springs |
| Playwright with cached Chromium 1243 | 1.64.1 | Research captures, QA screenshots at 390 to 2560 px, interaction scripts, `recordVideo` for motion review |
| Lighthouse | via npx | Performance, accessibility, best practices, SEO |
| Python 3.14: PyMuPDF, OpenCV, Pillow, NumPy | | Report text, frame extraction from the recording, contact sheets, logo analysis |
| fontTools 4.65 with Brotli | | Subsetting Archivo (variation axes kept) into a self-hosted WOFF2, checking glyph coverage (₹, tabular figures) |
| onnxruntime 1.30 | | Monocular depth estimation for team portraits at build time (model download pending approval, see the thesis) |
| @resvg/resvg-js, pngjs | | The logo diff test, icon generation |
| WebSearch, WebFetch | | Award winners, film UI references, library checks |
| git | | Staged commits |

**Not installed:** ffmpeg (Playwright records WebM directly), Blender (all geometry is procedural or drawn from the logo's own outlines), and the KTX2 and Draco command-line encoders. `@gltf-transform` (npm) can do Draco, Meshopt and KTX2 if we ship a model or large texture. The current plan ships neither, so there is nothing to compress yet.

## Research done with these tools (recon)

- **The original site.** Colours from commit `ebd6bbd` and from the live https://scyte.vercel.app via computed styles (see `docs/palette.md`).
- **The business report**, all 17 pages, re-read in full.
- **The Skiper UI recording**, sampled every 0.75 s into contact sheets (same reference as v1).
- **Thirteen variable fonts**, rendered at 12 px and 300 px in the palette. Axes, ₹ coverage, tabular figures and file size were checked with fontTools (`docs/recon/font-tests/`).
- **Live scroll captures** with library sniffing of landonorris.com and messenger.abeto.co (both tagged Site of the Year 2025 on Awwwards listing pages), plus igloo.inc and lusion.co. The v1 crawl of 16 studios is summarised in the thesis.
- **Film-UI practice:** Territory Studio interviews on Pushing Pixels.

## What was actually used, round 2

Recorded at the end of the build, so it can be checked against the plan above.

| Tool | What it did |
|---|---|
| `frontend-design` skill | The art-direction review of the token plan and the thesis against generic defaults |
| `dataviz` skill and its validator | The two chart series (`#AF9034`, `#37794A`) were validated against Ground and Surface before the dashboard and economics charts shipped |
| Built-in browser | Looking at pages by eye, reading the DOM and console, timing the archive drag and hand-off, the menu previews |
| Playwright (headless Chromium 1243) | Repeatable captures: chapter screenshots, the case 00 scene shots (with the site chrome hidden), the archive drag-throw-open film, the 404 solve, an idle-motion audit (two frames 500 ms apart at six scroll depths per page, no input), entrance films, and long-animation-frame attribution |
| Chrome DevTools Protocol | CPU profiles of the production build, with call stacks, to find what blocked the main thread after load (shader compiles) |
| Lighthouse 13.5 | Every route, desktop and mobile, against `next start` (see `docs/performance.md`) |
| Pillow | Contact sheets of captures, WebP encoding of the case 00 shots and the menu previews, pixel diffs for the motion audit |
| fontTools (`subset`, `varLib.instancer`) with Brotli | The 58 KB Archivo subset, and the two static cuts the share-image renderer needs (it cannot read variable fonts or WOFF2) |
| TypeScript's `transpileModule` | Running the 404 puzzle's generator in Node over 2,000 seeds: none starts solved, all are solvable |
| `next/og` (`ImageResponse`) | One share card per route |
| git | Staged commits, one per page or concern |

Not used in the end: subagents (art direction stayed in one place, as planned), Figma (no AI credits were spent; every image on the site is a real screenshot of the site or drawn in code), Context7 (never connected; the installed type definitions and Next's bundled docs were the reference) and the depth model for team photos (its download still needs a yes).

## Round 3 additions (23 October 2026)

The round-3 brief asks for every relevant tool to be used, and a reason for any that is skipped. This is what changed since the round-2 inventory above.

### New in the repo

| Script | What it does |
|---|---|
| `scripts/qa-baseline.mjs` | Steps down every route one viewport at a time at any widths, and takes two frames per step so motion can be told from stillness. With `--settle=4000` it shows attract mode. |
| `scripts/qa-density.py` | The brief's density audit: a 12 × 8 grid per frame, with an "any content" reading and a strict one. It writes contact sheets with empty cells hatched. It runs on every set piece in Round C. |
| `scripts/qa-record.mjs` | Interaction recordings: scrolls each route and uses whatever each screen offers (hold, drag, scrub, tap). Frames come from Chrome's screencast. |
| `scripts/qa-frames-to-video.py` | Turns the screencast frames into WebM (VP8) on a real-time timeline. OpenCV's bundled FFmpeg writes VP8 and VP9 WebM, so the gallery loops in W1 can be produced the same way, from the real scenes. |

**Why not Playwright's own video recording:** Playwright 1.64 wants ffmpeg build 1013, and only build 1011 is cached. Downloading it is a download, so the recorder uses the screencast instead, with no new download.

### Available and planned for this round

| Tool | Use in round 3 |
|---|---|
| `frontend-design` skill | The per-page world plan in `docs/set-pieces.md`, reviewed against templated defaults |
| `dataviz` skill and validator | P8, P9 and P10 (split world, control room, instrument cluster), with every new series validated against Ground and Surface |
| `gsap-*`, `css-animations`, `ui-motion`, `ui-interactions` skills (hzblj) | Timelines, ScrollTrigger pinning, interruptible springs, press feedback in the component library |
| `accessibility-review`, `design-critique` (design plugin) | The ten-flaw critique per set piece, and the WCAG pass in Round E |
| `unslop`, `ux-copy` | Every new string: cartridge labels, receipt lines, dossier states |
| `modern-web-guidance` | View Transitions (T5, W8), scroll-driven animation, `content-visibility` for the long Product page |
| `hzblj-skills:animation-specialist` agent | A second opinion when a pinned sequence janks and the cause is not obvious |
| `hzblj-skills:clean-code-reviewer` agent | A read-only review of each stage's diff before commit |
| Playwright, the CDP screencast, Lighthouse, Pillow, OpenCV, NumPy | Proof for every set piece: screenshots, recordings, density, performance |
| Built-in browser | Looking at every set piece by eye, and checking keyboard paths |
| Rapier (`@react-three/rapier`, installed) | P3, W4, T6 and the playable footer logo, loaded only on the routes that need it |
| Figma MCP (`generate_image`, `create_shader`, `export_video`, Weave models) | Can generate textures, HDRIs and loops. **Every call spends the team's Figma AI credits, so nothing is generated without a yes.** All set pieces have procedural fallbacks, and the plan needs no generated imagery |
| Figma `get_design_context`, `use_figma` | Only if the client wants the component library mirrored into a Figma file |

### Skipped, and why

| Tool | Why |
|---|---|
| `21st:21st-ui` (component marketplace) | Stock components are what the brief calls slop |
| Context7 | Still not connected; the installed `.d.ts` files and `node_modules/next/dist/docs` remain the reference |
| Claude in Chrome, computer use | The built-in browser and headless Playwright cover every check, without touching the user's own browser |
| `deep-research`, `docs`, `pptx`, `docx`, `xlsx`, analytics and marketing skills | No job on this build |
| Building subagents (`web-developer`, `fast-worker` and others) for pages | Art direction stays in one head. The round-1 complaint was incoherence, and handing pages to separate agents would bring it back |
| The depth model for team portraits | Its 25 to 100 MB download still needs a yes. The luminance height-field fallback covers T1 and T5 meanwhile |
