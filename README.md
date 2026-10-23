# Scyte

The website for Scyte, a web and app studio in Hyderabad, and for its flagship product: a consent-first WhatsApp recovery platform for online stores (working name in `src/config/site.ts`).

The whole site is one scroll story about a single idea: a store is a pipe, every visit is a drop of light, and the ones that fail leak out. Each page has its own chapter and its own signature moment, all drawn on one persistent WebGL canvas.

Next.js 16 (App Router, Turbopack), React 19, three.js with React Three Fiber, drei, postprocessing and Rapier, GSAP (ScrollTrigger, SplitText, ScrambleText, CustomEase) and Lenis on one clock. One variable typeface, Archivo, self-hosted.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

## Pages

| Route | Chapter | Signature |
|---|---|---|
| `/` | The Leak | The logo is the store. Drops of light run through glass letters from the first frame; scroll follows one shopper, Aarav, through the leaks, a recovery on a working phone and the result. |
| `/product` | The Machine | Six stations, each its own technique: an x-ray of a store page, a physical consent gate (Rapier), an intent landscape, a drag-and-drop rule switchyard, five working phones, and a holdout measured in two jars. The rail is Aarav's 20 minutes and scrubs the page. |
| `/studio` | The Assembly | A real build's six layers added by scroll and collapsed into a page, then three workbenches you can use: a website inspector, an app prototype and a content calendar. |
| `/work` | The Archive | A drag-and-throw WebGL film strip. Frames bend with speed and ripple under the pointer; opening one grows it into its case. Case 00 is this site; client slots are open. |
| `/work/this-site` | Case 00 | One screen per scene, each a real screenshot with what it does and how it is built. |
| `/team` | The Scan | A HUD that locks on to each person; the team is a data file. |
| `/contact` | The Conversation | A chat that fills the real form under it, answer by answer. |
| 404 | This page leaked | A pipe puzzle: turn the tiles until the liquid reaches home. Five plain ways back sit above it. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | The usual Next.js loop |
| `npm run lint` / `typecheck` | ESLint (React Compiler rules on) and `tsc --noEmit` |
| `npm run logo:verify` | Renders the traced logo at 1x and 4x and diffs it against the original PNG; fails above 0.5 % mismatch. Writes `docs/logo-verification/`. |
| `npm run brand:icons` | Regenerates favicon, apple-touch and manifest icons from the logo geometry |
| `npm run font:build` | Rebuilds the Archivo subset (both axes) and the two static cuts the share images use. `python scripts/build-font.py --og` rebuilds only the static cuts, offline. |
| `npm run team:assets` | Processes team portraits into thumbnails, depth maps and colours (see below) |
| `npm run qa:shots -- http://localhost:3000` | Screenshots every route at 390, 768, 1280, 1440 and 1920 px into `docs/qa/`, with console errors and horizontal overflow |

## Environment

Nothing is required to run or deploy. For the contact form to send real mail, set these:

| Variable | Purpose | Default |
|---|---|---|
| `RESEND_API_KEY` | Enables the Resend provider in `src/lib/mail.ts` | unset: enquiries are logged on the server |
| `CONTACT_TO_EMAIL` | Where enquiries go | `scytehq@gmail.com` |
| `CONTACT_FROM_EMAIL` | Sender on a domain verified with Resend | `Scyte <onboarding@resend.dev>` |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, sitemap and share images | `https://scyte.vercel.app` |

## Changing things

- **Rename the product:** `PRODUCT_NAME` in `src/config/site.ts`.
- **Add a team member:** drop a portrait at `public/team/<slug>.jpg`, run `npm run team:assets`, and add one object to `TEAM` in `src/data/team.ts`. Any `null` field shows as a visible `[ FILL ]`. With `scripts/models/depth-anything-v2-small.onnx` present, depth comes from that model; without it, from a luminance height-field.
- **Add a case study:** add an object to `WORK` in `src/data/work.ts` (there is a commented example). The archive strip, the case page, the sitemap, its share image and the open-slot count pick it up; the slot for that service closes.
- **Re-shoot case 00:** the scene screenshots in `public/work/this-site/` and the menu previews in `public/shots/` were taken from this site with headless Chromium (chrome hidden). Re-shoot after a visual change; see `docs/tooling.md`.
- **Facts that change:** WhatsApp rates and DPDP dates live in `VERIFY_BEFORE_PUBLISHING` in `src/config/site.ts` and are not printed as fact anywhere.
- **Analytics:** `src/lib/analytics.ts` exposes `track()`. Nothing is sent until a provider is registered with `setAnalyticsProvider`, and the privacy copy on `/contact` says so; change the copy if that changes.

## How it is built

- **The logo** is traced into `src/lib/logo/geometry.ts` and `public/brand/scyte-logo.svg`. Every rendering uses that geometry, including the glass letters on home and the share images. Proof: `docs/logo-verification/` (0.25 % mismatch; the remaining pixels are anti-aliased corners in the source PNG).
- **One typeface:** Archivo, both variation axes (weight 100–900, width 62–125), subset to the characters the site uses: 58 KB, self-hosted with `next/font/local`. Weight and width are the only voices; several headlines move them live.
- **Palette:** recovered from the original site (`docs/palette.md`): ground `#1B261D`, khaki `#C2B897`, cream `#E6D5B8`, plus Lumen `#F9DC7D` for emitted light.
- **One clock:** GSAP's ticker drives Lenis, ScrollTrigger and the canvas (`frameloop="never"` plus `advance`).
- **One canvas:** `src/components/gl/Stage.tsx`. A page section declares its scene with `<SceneSection scene="…">`; the scene's code is a separate chunk fetched as the section comes near, and frames are drawn only while it is on screen. Each scene compiles its shaders before its first frame (`src/components/gl/warm.ts`). Quality steps down through `PerformanceMonitor`, and every page works without WebGL.
- **Motion that never waits:** `src/components/motion/Reveal.tsx` runs on every route. Headings rise out of masks, HUD labels decode, copy settles in and images pour in as they scroll into view. 3D scenes breathe at rest (`src/components/gl/idle.ts`), lists run a light through their items (`useRunningLight`), and the workbenches demonstrate themselves until someone touches them (`useIdleDemo`). Regions that choreograph themselves opt out with `data-motion-own`. Everything stops with reduced motion, from the OS or the menu switch.
- **Phones:** one chat engine (`src/lib/chat/`) drives every phone, with flows as data: the payment-failed rescue, COD confirmation, cart recovery, back in stock, tracking, review, and Scyte's own contact flow.
- **Route transitions:** `src/components/transition/`. Links go through `TransitionLink` and a liquid wipe that names the next chapter. A page can bring its own cover instead: the archive grows a frame to full screen and hands it to a layer that outlives the route (`Handoff.tsx`).
- **Share images:** one per route, drawn by `src/lib/og.tsx` in the palette with the exact wordmark. `pageMeta()` in `src/config/meta.ts` restates the whole card per page, because Next replaces a parent's `openGraph` rather than merging it.

Design rationale: `docs/design-thesis.md`. Tools used: `docs/tooling.md`. Performance: `docs/performance.md`.

## Decisions and assumptions

- Scyte is the umbrella brand; the WhatsApp platform is its flagship product, with its own page. `/services` from v1 redirects to `/studio`.
- No client work has been supplied, so case 00 is the site itself, made of real screenshots. Client slots stay open and say so.
- The home hero shows the exact logo first, then thins it to 70 % over the glass so the drops show through. The client chose that look over a logo that stays still until the first scroll.
- Every figure from the business report is labelled illustrative where it appears. No WhatsApp prices, no DPDP dates, no competitors, no WhatsApp logo.
- The demo store, its order and its shopper (Aarav) are fictional and labelled as such.

## Placeholders that need real content

- `PRODUCT_NAME` (currently `[BRAND NAME]`).
- Team: names, codenames, bios, photos, skills, links and locations. The four seats are the roles the report plans.
- Client case studies (`WORK` is empty).
- Studio phase lengths (`src/components/studio/HowWeWork.tsx`) and each service's typical timeline and starting price (`src/components/studio/Studio.tsx`), shown as `[CONFIRM]`.
- The pilot's monthly price on `/product` (`src/components/product/Pilot.tsx`), shown as `[ FILL: ₹ a month ]`.
- The LinkedIn URL in `src/config/site.ts`, inherited from the old site, contains "undefined".

## Measured

See `docs/performance.md` for the table, the method and what moved each number.
