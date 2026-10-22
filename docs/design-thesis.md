# Scyte: design thesis

## The thesis

Scyte builds precise, fast, slightly dangerous things. The site is a **field instrument**: warm, tactile hardware colours taken from the logo (bone on forest), exact mechanical motion, and one hot signal colour reserved for the moment something locks on.

Its owned motif comes straight out of the wordmark. The letters of SCYTE are drawn with a **5-unit stroke** on a 140 x 37 grid, with deliberate notches (the S's bottom bar sits one unit in, the E's middle bar stops short, the Y's arms overshoot the cap line by a quarter of a unit). That stroke becomes the site's cell, the **event pixel**. Everything that moves is built from it: the preloader assembles the logo cell by cell, route transitions slice the screen into columns of cells, the team page cuts names into strips on the same grid, and one persistent WebGL field of event pixels re-forms itself on every route. On the home page it is a dot matrix that records your cursor, on /product it is the shopper-data pipeline, and on /team it is the halftone portrait.

The product's own idea runs through the studio site. The home page instruments your visit the way the WhatsApp platform instruments a store (engaged time, scroll depth, dwell) and shows you the readout, computed in your browser and never sent anywhere. The site demonstrates the product before it describes it.

## What we looked at

Live, in Chromium via Playwright, with scripted scroll and pointer input (screenshots in the research scratchpad, observations below): igloo.inc, emotion-agency.com (behind its audio gate), lusion.co, activetheory.net, basement.studio, darkroom.engineering, immersive-g.com, cuberto.com, obys.agency, unseen.co, resn.co.nz, makemepulse.com, territorystudio.com, the Skiper UI "hover members" recording, and the current Awwwards Sites of the Day list (Emotion, Format, Signal, Odyssee, Lidar Drone Scanning, Butter and others). We also read their network traffic and stylesheets for technique: Draco geometry, KTX2 textures and MSDF text on igloo, Lenis on emotion, darkroom, cuberto and makemepulse, and the easing curves listed under the motion system below.

## Twelve borrowed principles, and the twist we add

We borrow principles, never pixels. No code, shader, layout, asset, copy or branding was copied.

| # | Principle, and where we saw it | Where it lands on Scyte | Our twist |
|---|---|---|---|
| 1 | **One continuous camera through one world** (igloo.inc). Scrolling is travel, not paging. | `/product` pipeline: Collect, Identify, Understand, Decide, Send, Measure as stations in a single scene. | The world is made of the logo's own cells, and the camera moves like a plotter head: it dwells at each station, then glides on an eased rail. It does not float on a cinematic spline. |
| 2 | **A loader that counts real work** (igloo's glyph progress bar, Lusion's giant counter). | Preloader. | The counter is tied to real tasks (fonts, WebGL context, shader compile, first frame), and the logo assembles one cell per task fraction, then flies into the hero as the same object. |
| 3 | **One particle system that morphs between forms across sections** (emotion's swarm becoming a logo, then a sphere). | The persistent event-pixel field across routes. | Pixels are data, not sparkle: a dot matrix that records the visitor on home, labelled events in the pipeline, halftone dots of a portrait on the team page. Route changes morph the same instances. |
| 4 | **HUD annotations with leader lines on 3D objects; text that decodes from scramble** (igloo's specimen labels, film UI from Territory Studio). | Pipeline station labels, the team HUD, dashboard readouts. | No Iron-Man cyan. Bone readouts with signal only for locks and alerts, bracket ends cut in the logo's notch shapes, and the scramble draws only from characters the readout will finally show. |
| 5 | **Vertical strip slicing between words** (the Skiper UI reference). | Team page; the word stack on home. | Strips are cut on the logo's 5-unit grid (28 strips across the wordmark). At rest the giant word is the exact traced logo, not a font. |
| 6 | **A fixed lens the list scrolls through; position is selection** (Obys' bracketed project index). | Playbooks navigator on `/product`. | The lens is a phone-shaped scope. Whatever playbook sits in it opens its live message and event chain, and the two wedge playbooks (payment failed, COD) take a double-height slot. |
| 7 | **Staircase composition of giant words with marginal notes** (makemepulse). | Home manifesto lines and the product intro. | The steps snap to the cell grid, and the marginal notes are real event names and timestamps from the report's "shopper's 20 minutes". |
| 8 | **Press-and-hold as a weighted interaction** (Resn's click-and-hold). | Consent gate demo. | You hold "Send without consent" and the machine refuses: the gate slams in stencil type. STOP is a single click and acts instantly, as the report requires. |
| 9 | **Dither and halftone as texture; a binary mode switch** (basement's stippled graphics and Human/Machine toggle). | Team portraits; the consent on/off switch. | The halftone dot is a square event pixel. Pointer proximity sharpens it, like a lens focusing. |
| 10 | **An instrument strip instead of a nav bar** (darkroom's micro-widget header). | Global navigation. | Restraint: only real readouts. Hyderabad time, scroll position and sound state. No decorative widgets. |
| 11 | **Silence as pacing; serif for human moments** (Immersive Garden). | Rhythm across every page. | Dense instrument sections alternate with single Newsreader italic lines ("Aarav still wants the hoodie."). |
| 12 | **A cursor with states and magnetic targets** (Cuberto). | Global cursor. | States are built from cells and corner brackets, not blobs: default cell, link bracket, view, drag, HUD lock (the only ring), and hidden over inputs. |

## Tokens

**Colour** (dark first; one inverted paper section per long page for rhythm)

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#0A0F0C` | deepest background |
| `--forest` | `#1C261F` | the logo's own ground; surfaces |
| `--moss` | `#2A3A2F` | lines, raised surfaces, inactive cells |
| `--bone` | `#C2B897` | logo, headlines, readouts |
| `--paper` | `#EDE8D8` | inverted sections, long-form text on dark |
| `--signal` | `#FF3D2E` | under 5 % of any screen: cursor lock, alerts, the key number |

Derived: `--bone-dim #8E876E` for secondary text on ink (AA at body sizes), `--ink-on-paper #1C261F` for text on paper.

**Type**

- Display: **Big Shoulders** (variable, optical size 72, weight 800 to 900). Its squared counters and flat-sided rounds match the logo's rectilinear grammar. Its stencil cut appears exactly once, on the 404 and the consent refusal.
- Voice: **Newsreader** italic and roman, with optical sizing on. Used for human moments and long-form body text.
- Data: **Martian Mono** (variable width) for HUD readouts, timestamps and figures. Tabular numerals throughout.
- Fluid scale with `clamp()`. Tight tracking on display sizes, hanging punctuation on serif blocks, typographic quotes and apostrophes everywhere.

**Layout**

A 12-column grid with an off-centre spine at column 5. Giant type bleeds past the viewport. One dominant moment per viewport. Pinned storytelling is used only where there is a story (the pipeline, the shopper's 20 minutes); horizontal motion only where it earns its place (the marquee, the playbook lens).

**Motion** (tokens in `src/lib/motion.ts` and `globals.css`)

| Name | Curve | Use |
|---|---|---|
| `latch` | `cubic-bezier(0.62, 0, 0.06, 1)` | the snap: target locks, menu cells, slice strips |
| `glide` | `cubic-bezier(0.2, 0.84, 0.16, 1)` | entrances, camera dwell-to-glide |
| `cut` | `cubic-bezier(0.6, 0, 0.84, 0.24)` | exits, which accelerate away |
| `drift` | `cubic-bezier(0.38, 0, 0.22, 1)` | long scroll-linked in-outs |
| springs | latch `{stiffness 520, damping 34, mass .6}`, dock `{stiffness 210, damping 22}` | thumbnails, magnetic buttons |

Durations: 120 ms (feedback), 280 ms (UI), 600 ms (HUD assembly), 900 ms (route transition). Stagger: 18 ms per cell, 40 ms per text line, 70 ms per HUD panel. Scroll-linked motion tells the story; time-based motion answers input.

## What we refuse

From the brief, and from what our own first drafts would default to: gradient orbs, glass cards, a centred pill-badge hero, icon grids, fade-up on everything, emoji, stock photos, fake logos, fake numbers, filler verbs, cyan HUDs, and the word "seamless".

## Truthfulness

Every number on the site is either measured live in the visitor's browser (and labelled as such), taken from the business report and labelled "illustrative", or visibly a placeholder. Team members and case studies render as designed `[ FILL ]` states until real content is supplied. WhatsApp pricing and DPDP dates live in `src/config/site.ts`, flagged "verify before publishing", and are not printed as fact.
