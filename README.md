# Scyte

The website for Scyte, a web and app studio in Hyderabad, and for its flagship product: a consent-first, behaviour-to-WhatsApp recovery platform for online stores (working name in `src/config/site.ts`).

Next.js 16 (App Router, Turbopack) on Vercel. GSAP with ScrollTrigger, SplitText and ScrambleText, Lenis, Three.js with React Three Fiber and drei, custom GLSL, and Motion for the team dock springs.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | The usual Next.js loop |
| `npm run lint` / `typecheck` | ESLint (React Compiler rules on) and `tsc --noEmit` |
| `npm run logo:verify` | Renders the traced logo with resvg at 1x and 4x and diffs it against the original PNG. Writes `docs/logo-verification/`. Fails above 0.5 % mismatch. |
| `npm run brand:icons` | Regenerates favicon, apple-touch and manifest icons from the logo geometry |
| `npm run qa:shots -- http://localhost:3000` | Screenshots every route at 390, 768, 1280, 1440 and 1920 px into `docs/qa/` and reports console errors and horizontal overflow |

## Environment

Nothing is required to run or deploy. For the contact form to send real mail, set these on Vercel:

| Variable | Purpose | Default |
|---|---|---|
| `RESEND_API_KEY` | Enables the Resend provider in `src/lib/mail.ts` | unset: enquiries are logged on the server |
| `CONTACT_TO_EMAIL` | Where enquiries go | `scytehq@gmail.com` |
| `CONTACT_FROM_EMAIL` | Sender on a domain verified with Resend | `Scyte <onboarding@resend.dev>` |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, sitemap and the OG image | `https://scyte.vercel.app` |

To use a different mail service, add one `MailProvider` in `src/lib/mail.ts`. The form, the validation (one shared zod schema in `src/lib/contact-schema.ts`) and the server action stay as they are.

## Changing things

- **Rename the product:** `PRODUCT_NAME` in `src/config/site.ts`.
- **Make it a product-only site:** the information architecture keeps the studio and the product apart (`/services` and `/product` are self-contained). `SITE_MODE` in the same file records the intent; to flip it, point `/` at the product page sections and keep the studio at `/services`.
- **Add a team member:** add one object to `TEAM` in `src/data/team.ts`. Put a portrait in `/public/team/` and set `photo`; without one, a generated silhouette is drawn. Any `null` field renders as a visible `[ FILL ]`. The dock, HUD, dossier and mobile sheet scale from 4 to 14 people.
- **Add a case study:** add an object to `WORK` in `src/data/work.ts` (there is a commented example). The index, the case page, the sitemap and the shared-element transition pick it up.
- **Facts that change:** WhatsApp rates and DPDP dates live in `VERIFY_BEFORE_PUBLISHING` in `src/config/site.ts` and are not printed as fact anywhere on the site.
- **Analytics:** `src/lib/analytics.ts` exposes `track()`, already called on navigation and contact submits. Nothing is sent until you register a provider with `setAnalyticsProvider`.

## How it is built

- **The logo** is traced into `src/lib/logo/geometry.ts` and `public/brand/scyte-logo.svg` (one path, `currentColor`). Every rendering uses that geometry: nav, preloader, footer, favicons, the OG image, the team page and the slice transitions. The original raster is kept untouched at `public/brand/scyte-logo-original.png`. Proof: `docs/logo-verification/` (0.245 % native mismatch; the remaining pixels are corners where the source PNG blends to 50 %, which no sharp vector reproduces).
- **One clock:** GSAP's ticker drives Lenis, ScrollTrigger and the WebGL stage (`frameloop="never"` plus `advance`).
- **One canvas:** `src/components/stage/` is a single fixed WebGL canvas for the whole site. One instanced field of square "event pixels" takes a different formation per route (a dot matrix on home, the six-station pipeline on `/product`, a halftone portrait on `/team`, drift on the 404) and morphs between them. Pages declare their formation with `<StageScene>` and their visible regions with `<StageWindow>`; the stage only renders while a window is on screen. It degrades by pixel count and DPR through `PerformanceMonitor`, and the site works fully without it.
- **Loading:** the WebGL chunk loads after the page is idle on capable desktops (the preloader counts its warm-up) and at the first scroll or tap on touch and low-power devices.
- **Motion tokens:** `src/lib/motion.ts` and the `--ease-*` and `--dur-*` custom properties in `src/app/globals.css`.
- **Route transitions:** `src/components/transition/`. Links use `TransitionLink`; the cell curtain covers, the route commits, the curtain dissolves. Back and forward navigate natively.
- **Visit readout:** `src/lib/telemetry.ts` measures the visitor's own engaged time, scroll depth and events, in the browser only, with no network calls or cookies. It powers the hero panel, the word stack and the footer line.

Design rationale: `docs/design-thesis.md`. Tools used: `docs/tooling.md`.

## Decisions and assumptions

- Scyte is the umbrella brand; the WhatsApp platform is its flagship product, with its own page.
- Studio services get a dedicated `/services` page plus a full section on home. The studio is the warm-lead channel the report names, so it earns real space on home, and a URL of its own for search.
- `output: "export"` was removed so the contact form can run as a server action on Vercel. `netlify.toml` was updated accordingly.
- Dark only. The brand is dark-first, so there is no light theme. `color-scheme: dark` is declared, and the paper sections are a deliberate inversion, not a theme.
- Newsreader is loaded without its optical-size axis. The axis doubled the file size; optical sizing is carried by the display face.
- The five videos from the base site looked like recordings of other studios' websites, so they were moved to `archive/base-site-videos/` and are not shown as Scyte work.
- The economics model reproduces the report's illustrative case exactly (₹54,420, which the report rounds to ₹54,400, with no holdout and on revenue). Its defaults then take the holdout out of the pool and apply a 50 % contribution margin, which the report does not give. Both are labelled.

## Placeholders that need real content

- `PRODUCT_NAME` (currently `[BRAND NAME]`).
- Team: names, codenames, bios, photos, skills, links and locations. Seats are the report's planned roles.
- Work: no case studies yet; the page shows designed empty slots.
- Product status line on the home teaser (`[ FILL: pre-revenue, pilots or paying ]`).
- Plan prices on `/product` (`[ FILL: ₹ a month ]`).
- The dashboard runs on seeded sample data (`src/data/dashboard.ts`), labelled as such on the page.
- Studio process and promises (`src/data/services.ts`, `src/app/services/page.tsx`) are written from the base site's claims; check they match how you actually work.

## Measured

Lighthouse 13.5 against `next start`, in headless Chromium with SwiftShader software WebGL. Software GL runs the GPU work on the CPU, so these numbers are pessimistic for real devices.

See `docs/performance.md` for the per-route table. Accessibility is 100 on every audited route; CLS is 0 to 0.001 everywhere.
