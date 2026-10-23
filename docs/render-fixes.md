# Render fixes, round 4

The client reported render problems on the deployed build, with three screenshots from a Windows laptop in Edge at an effective viewport between 1366 × 768 and 1536 × 864. Each was reproduced on this machine at 1366 × 768, traced to its cause, and fixed there rather than hidden. The harness that now guards them is `scripts/qa-matrix.mjs`, described at the end.

## The reported bugs

### 1. Product dashboard: an orphan block and panels off the grid

**Seen.** A large, flat, light-green block to the right of the "Incremental revenue" panel. The per-flow table and the lower panels were all different widths and offsets.

**Cause.** The dashboard lived inside the old `DeviceFrame` laptop, and its 12-column console grid got one panel per row with spans that did not add up to 12, so rows ended early. The light-green block was the laptop screen's own background showing through the hole. The laptop's screen also took its height from the content, about 2.5 screens tall. That is the "MacBook screen is way too long" in the client's note.

**Fix.** Rebuilt at the root, not patched:

- `src/components/kit/LaptopShell.tsx` gives the laptop a fixed 16:10 screen. The page inside is laid out at 1280 × 800 logical pixels and scaled to fit, with the screen no taller than 70 % of the viewport. The page inside scrolls; the screen never grows.
- `src/components/product/dashboard/DashboardApp.tsx` is the dashboard as a real app, on one explicit grid. A fixed 210 px sidebar sits beside a main column, and every section is a grid with named tracks and `min-width: 0` children. No panel can float free of it, and no row can end early.
- The screen is scaled with a flat 2D `scale()` and carries no 3D transform at rest, so its text is rasterised sharp. The old frame had `will-change: transform` on a 3D-rotated body, which softened everything on it.

**Proof.** `docs/proof/render/dashboard-1366.png` and `dashboard-1440.png`, plus the matrix (no empty block at any size).

### 2. Product playbooks: stray text, clipped glyphs, rail and pill over the phone

**Seen.** Text from another playbook ("COD confirmation") showed behind the sticky header. Half-clipped glyphs ran down the left edge. The progress rail sat over the phone, and the "Book a store audit" pill sat on the phone's message row.

**Cause.** Three separate things:

1. The playbooks sat in an unpinned section that scrolled under the nav. The nav was 92 % opaque, so the next section's headings showed through it.
2. The neighbouring pinned stations used `overflow: hidden` on sticky elements. At some zoom levels the browser painted a sliver of the next panel's text at the viewport edge during the hand-off between pins.
3. Nothing kept the fixed UI out of the content. The rail and the pill were placed by fixed offsets from the edge.

**Fix.**

- The playbooks are now a pinned scroll-through (`src/components/product/Playbooks.tsx`) whose sticky stage uses `overflow: clip` and `isolation: isolate`. Only the current playbook's text exists in it, so nothing can show through.
- The nav turns fully solid (`var(--ground)`), with its hairline, as soon as anything scrolls under it.
- Every pinned stage reserves the right gutter (`calc(var(--margin) + 64px)`), and the rail and frame live in it. Below 1100 px they collapse to the frame's slim strip.
- The audit pill (`src/components/shell/AuditButton.tsx`) now watches two intersection observers. One shrinks the viewport to the pill's own box and hides the pill when anything tagged `data-avoid` enters it. The other hides the pill while a set piece tagged `data-avoid-pill` fills the middle of the screen. Every phone, laptop, docked control and finale action is tagged. The pill also compacts below 1366 px.

### 3. Home finale: headline over the logo, oblique camera, smeared glow

**Seen.** "We build the machine, and the storefront in front of it." overlapped the 3D logo. The camera looked down at the letters at about 45°, so they were hard to read. The glow was smeared.

**Cause.** The last camera key was a fixed position, `[0, 150, 150]`, looking at `[0, -26, -4]`: an overhead shot that did not know where the copy was. The smear came from three things stacking:

- liquid cores drawn at 2.2× Lumen without tone mapping;
- bloom at 1.05 with a low threshold;
- depth of field left on at the resting shot, so everything off the focus plane was blurred.

**Fix.**

- The resting camera now solves itself to a safe frame (`[data-finale-logo]`) that the closing copy leaves free, at 8° of elevation, square on (`src/components/gl/scenes/home/Rig.tsx`). The headline and buttons sit in a band below that frame and can never reach the letters. The frame is marked with viewfinder corners.
- `src/components/gl/BulbString.tsx` puts marquee bulbs along the letters' own centrelines. Each bulb is instanced and has a real glass shell, a filament and a socket. They light in sequence with a flicker that settles. Only the filament is bright enough to bloom, so halos sit around sharp bulbs. A dark floor reflects them.
- Depth of field now follows the camera's speed (`src/components/gl/post-state.ts`). It is full while travelling and zero at rest. Bloom eases to 62 % on the resting shot, and the liquid cores drop to 20 %, so the bulbs carry the light.

**The nav logo "clipped at the left".** Checked at 1366, 1440 and 1536 at 100 % and 125 %. The nav logo sits at `--margin` from the edge and is never clipped. The capture's left edge was the browser window border on a scaled display, so this was a capture artefact, not a bug.

### 4. "[BRAND NAME]" in browser tab titles

**Cause.** `src/app/product/page.tsx` built its title from `PRODUCT_NAME`, and the home hero and team intro printed it in copy.

**Fix.** `src/config/site.ts` keeps the placeholder in one constant behind `PRODUCT_NAME_FINAL = false`. Titles and Open Graph tags use "WhatsApp recovery for online stores" until the name is final, and copy uses `productName()`, which falls back to a description.

## Bugs the harness found

| Bug | Cause | Fix |
|---|---|---|
| Home layout shift 0.26 at 1366, 0.60 at 390 | The finale's scrim was the side scrim's `::before`, resized into a bottom band when the chapter changed, which counts as a layout shift | The bottom scrim is its own `::after` layer that only fades; the sticky stage got `isolation: isolate` so it sits under the copy |
| Studio and Contact refused to hydrate | `Reveal` set inline styles on server HTML inside Suspense boundaries before React hydrated them; React then saw attributes it had not rendered and gave up on the tree | `Reveal` waits up to 2.5 s for streamed boundaries and only touches nodes React has claimed (`__reactFiber$` present) |
| `removeChild` crash on the playbooks | The heading split by `Reveal` was also re-rendered by React | Set pieces that animate their own type carry `data-motion-own` |
| Studio: flat empty blocks in the website bench and the app prototype | Panels with a background and no content at some scroll positions | Logged for the Studio rebuild (LaptopShell and the scroll-through benches replace them) |

## Fixed-UI rules, now permanent

- **One z-index scale** in `globals.css`. In order: frame, rail, pill, menu, nav, open rail, dossier, wipe, toast, palette, tip, cursor, loader, skip link. No fixed layer uses a bare number.
- **The header** is solid forest with a hairline once anything scrolls beneath it.
- **The reserved gutter.** Content in pinned stages stops at `calc(var(--margin) + 64px)` from the right. The rail and the frame live inside that gutter and collapse into the frame's strip below 1100 px.
- **The audit pill** compacts below 1366 px, hides over `data-avoid`, and hides during `data-avoid-pill` set pieces.

## The harness

`node scripts/qa-matrix.mjs <baseUrl>` runs every route and fails on:

| Check | How |
|---|---|
| Horizontal overflow | `scrollWidth` against the viewport, at every step |
| Fixed UI over content | the pill, the rail and the frame strip against every `[data-avoid]` box |
| Clipped text | a text element whose content overflows its own clipped box, excluding screen-reader text |
| Empty blocks | any element over 200 × 200 px with no text or media and a set background, confirmed from its pixels (luminance σ under 2.5) |
| Console errors | any error fails the run |
| Layout shift | CLS accumulated over the stepped scroll, failing above 0.1 |

It also screenshots every pinned section at 0, 25, 50, 75 and 100 %.

It has three sizes:

- `--quick`: 1366 × 768 and 390 × 844.
- The default: the client's laptops, plus the common desktop and phone sizes, at 100 % and 125 % zoom.
- `--full`: the whole brief matrix. That is eight desktop and four small viewports, browser zoom at 100, 110, 125 and 150 %, and CPU throttled 4× and 6×. It adds a SwiftShader pass as the weak-GPU proxy.

`--browsers=chromium|msedge|firefox|webkit` adds the installed Edge channel (verified on this machine) and Firefox and WebKit. The Firefox and WebKit builds in the cache are older than this Playwright expects, so those two need `npx playwright install firefox webkit` first. That is a download, so it waits for the client's go-ahead, and the script reports them as skipped until then. Zoom is emulated the way browsers do it: the layout viewport shrinks by the zoom and the device pixel ratio grows by it.

Results go to `docs/qa/matrix/report.md`. The latest full run is summarised in `docs/final-report.md`.
