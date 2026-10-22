# Tooling inventory

What was available in the build environment, and how each was used. "Skipped" entries say why.

## Used

| Tool | Used for |
|---|---|
| **frontend-design skill** | Art direction pass: token plan, review against generic defaults (dark plus single accent, mono labels, eyebrow chrome), copy rules. |
| **Playwright 1.64 + cached Chromium** | Research crawl of 16 reference sites (scripted scroll and pointer, screenshots, font, library and easing extraction); QA screenshots at 390, 768, 1280, 1440 and 1920 px (`npm run qa:shots`); interaction checks. |
| **Built-in browser pane** | Network inspection of igloo.inc (Draco, KTX2, MSDF, worker pipeline). The pane was hidden, which throttles requestAnimationFrame, so visual capture moved to headless Playwright. |
| **Python: OpenCV, PIL, NumPy, PyMuPDF** | Frame extraction from the Skiper UI screen recording (one frame every 0.25 s) and contact sheets; PDF text extraction; logo coverage analysis and the geometry fit (Nelder–Mead on antialiased coverage). |
| **@resvg/resvg-js** | Reference SVG renderer for the logo proof (`npm run logo:verify`) and for raster icon generation. |
| **Next.js bundled docs** (`node_modules/next/dist/docs`) | Version-matched API reference for Next 16.4: async params, metadata files, ImageResponse, server actions, view transitions. |
| **npm registry** | Picking current, mutually compatible versions to pin. |
| **dataviz skill** | Chart forms, colour roles and labelling for the product dashboard. |
| **git** | Staged commits. |

## Available, skipped, and why

| Tool | Why it was not used |
|---|---|
| Figma MCP | Not authenticated in this session, and the design is authored directly in code, where the motion lives. |
| Krea / Higgsfield or other image generation | Not connected. Every texture and portrait placeholder is generated procedurally (event-pixel halftones, silhouettes), which also keeps the bundle free of large binaries. |
| Context7 or similar docs MCP | Not present. The bundled Next docs and installed type definitions covered the gaps. |
| KTX2 / Draco / Meshopt | No textures or models ship. All 3D is procedural geometry and instanced cells, so there is nothing to compress. The loaders are documented in the README for when real assets arrive. |
| ffmpeg / poppler | Not installed. OpenCV and PyMuPDF did the same jobs. |
| Subagents | Not spawned: the work needed one consistent art direction held in one head, and handing pieces off would have cost more context than it saved. |
| Analytics plugins (Amplitude, etc.) | The brief asks for analytics-ready, not hard-wired. `src/lib/analytics.ts` exposes a no-op `track()` with a provider slot. |
