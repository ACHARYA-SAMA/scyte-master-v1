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
