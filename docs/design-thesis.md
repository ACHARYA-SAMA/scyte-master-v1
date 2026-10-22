# Scyte: design thesis, round 2

## Why v1 failed

The client was right. v1 had one idea, a field of square "event pixels", and spent it everywhere. The product page looked pixelated and the other pages looked empty. It used four typefaces. Most of its interaction was hover. Its phones were pictures. Its red accent and paper sections broke away from the green and khaki the client already liked.

Round 2 keeps v1's plumbing: the routes, the verified logo and its diff test, the contact server action, the metadata, the team data shape, the accessibility scaffolding, the preloader's task counting and the economics model. Everything a visitor sees is rebuilt. The pixel field is deleted, not restyled.

## The idea: light is money

Every shopper on a store is a drop of light. Light moving through dark green glass is revenue on its way to becoming an order. A leak is light falling out of the system and going dark: a UPI timeout, a bank decline, a cash-on-delivery order nobody confirmed. The product catches the light and puts it back. The holdout group, which never gets a message, is how you prove how much came back.

That one rule does a lot of work.

- **One material language.** Dark green glass, brushed dark metal, matte forest surfaces, and Lumen liquid as the only light source in every 3D scene.
- **Status without red.** Loss is light going out. A failed payment is a drop that dims to Line and falls away. Nothing needs a warning colour.
- **Every glow has a reason.** Nothing lights up unless intent or money is moving through it. That is the opposite of a decorative particle background, and it is the answer to the client's "eww".

## The logo is the machine

Every stroke of the wordmark is 5 units wide on a 140 by 37 grid. Extrude the strokes 5 units deep and each one becomes a square-section glass duct. The five letters already read as plumbing:

| Letter | Shape | Role in the pipeline |
|---|---|---|
| S | a winding run | the browsing path: product views, size chart, reviews |
| C | a loop that almost closes | the cart, and the recovery loop that comes back for it |
| Y | a fork | the payment: one arm succeeds, the other fails |
| T | a junction | the decision: send, hold for quiet hours, suppress, or hold out |
| E | one trunk, three outlets | the send, out to different playbooks |

The home page's camera travels through this network. Its last move pulls back far enough to show that the network was the logo the whole time.

Shape rule: whenever the logo is at rest, anywhere on the site, it is the exact traced SVG (`public/brand/scyte-logo.svg`, 0.25 % worst-case mismatch against the original PNG, re-verified on 23 October 2026). The glass version exists only while it moves, and every move ends by handing back to the SVG.

## One story in seven chapters

| Route | Chapter | What it tells | Signature technique, used on this page only |
|---|---|---|---|
| `/` | The Leak | what goes wrong, and one recovery in first person | Transmissive glass pipe journey through the extruded logo, with depth of field and motion blur |
| `/product` | The Machine | how it works, station by station | Six stations in six techniques: exploded view, rigid-body physics, a displaced terrain, a switchyard, a device bank, a split-world difference shader |
| `/studio` | The Assembly | who builds it, and what else they build | An exploded stack of layers that assembles a real website |
| `/team` | The Scan | the people | Depth-mapped hologram portraits with slice-swapped names |
| `/work` | The Archive | proof, once there is some | An inertia drag gallery with velocity bend and liquid hover |
| `/contact` | The Conversation | talk to us the way your customers will talk to you | A chat on an interactive phone that fills a real form |
| 404 | The Lost Drop | a toy | A pipe puzzle you solve to get home |

`/services` becomes `/studio`, matching the original site's nav label, with a permanent redirect.

## Palette

Recovered from the original source; the full extraction is in `docs/palette.md` and the board in `docs/recon/palette-and-type.png`.

| | Token | Hex |
|---|---|---|
| Recovered | Ground, Ground deep, Surface, Raised, Line | `#1B261D` `#152018` `#253026` `#2B3A2F` `#334638` |
| Recovered | Khaki, Khaki light, Cream | `#C2B897` `#CFC7AA` `#E6D5B8` |
| Derived | Abyss, Muted, Lumen | `#09120B` `#929884` `#F9DC7D` |

Proportions on every screen: green about 85 %, khaki tones about 13 %, Lumen under 2 % and only as emitted light. There are one or two inverted khaki bands per long page, placed where the subject changes.

## Type: Archivo, one family

### The test

Thirteen variable families were rendered in the palette at 300 px (heaviest weight, narrowest width), 150 px (lightest, widest), a 58 px headline, 16 px and 12 px body, a 12 px uppercase HUD line and tabular figures. Renders are in `docs/recon/font-tests/`. Coverage was checked with fontTools, not by eye.

| Family | Axes | ₹ | Tabular | Latin WOFF2 | Verdict |
|---|---|---|---|---|---|
| Bricolage Grotesque | opsz 12–96, wdth 75–100, wght 200–800 | yes | yes | 128 KB | Ink traps get loud when condensed, and it is the most common indie-launch face of the last two years. Not clean. |
| Host Grotesk | wght 300–800 | yes | **no** | 20 KB | No width, no tabular figures |
| Funnel Display | wght 300–800 | **no** | yes | 17 KB | No ₹, no width |
| Schibsted Grotesk | wght 400–900 | yes | yes | 46 KB | Handsome, but there is no width axis for condensed display |
| Familjen Grotesk | wght 400–700 | yes | yes | 18 KB | Stops at 700 and has no width axis |
| **Archivo** | **wdth 62–125, wght 100–900** | **yes** | **yes** | **88 KB** | **Chosen** |
| Mona Sans | wdth 75–125, wght 200–900 | yes | yes | 96 KB | Very good, but the Site of the Year 2025 winner we studied (landonorris.com) is set in it, so we would look derivative |
| Hubot Sans | wdth 75–125, wght 200–900 | yes | yes | 91 KB | Its serifed I and dotted zero read as a tech gimmick in body text |
| Anek Latin | wdth 75–125, wght 100–800 | yes | yes | 101 KB | Strong story (Ek Type, Mumbai, with Telugu and Devanagari siblings), but the condensed HUD line crowds at 12 px |
| Google Sans Flex | opsz, wdth 25–151, wght 1–1000, ROND, slnt | yes | yes | **1,009 KB** | The widest axes, but ten times the bytes, and it reads as Google |
| Zalando Sans | wdth 75–125, wght 200–900 | **no** | yes | 84 KB | No ₹ |
| Science Gothic | wdth 50–200, wght 100–900, CTRS, slnt | yes | yes | 234 KB | Square gothic. Great for a readout, poor for a paragraph. |
| TikTok Sans | opsz 12–36, wdth 75–150, wght 300–900 | yes | yes | 124 KB | Excellent craft, but it carries another brand's identity |

### Why Archivo

- **The widest width range among the clean grotesques** (62 to 125, a factor of two). At width 62 and weight 900 its rounds go nearly flat-sided, which matches the logo's rectilinear strokes better than any other candidate. At width 125 and weight 150 it becomes a wide, quiet voice that does the job v1 gave to a serif.
- **Everything the content needs.** ₹ and tabular figures are built in, and its 12 px body text is open and even (see `docs/recon/font-tests/archivo.png`).
- **No borrowed identity.** It is not a brand face and not this year's default.
- **The cost:** no optical-size axis. Optical sizing is done by hand: tracking and weight are set per step of the scale, so small text runs a little looser and heavier and display text tighter.

### Roles

| Role | Width | Weight | Tracking | Use |
|---|---|---|---|---|
| Bleed | 62 | 900 | −0.04em | Chapter words wider than the viewport, team names fitted to width |
| Display | 62 to 75 | 800 | −0.035em | Page titles, the giant numbers |
| Wide | 125 | 150 to 250 | −0.02em | Human moments: "Aarav still wants it." |
| Headline | 100 | 680 to 720 | −0.025em | Section heads |
| Body | 100 | 400 | 0 | 16 to 18 px, measure 60 to 68 characters |
| Small | 100 | 440 | +0.005em | 12 to 14 px |
| HUD | 62 to 75 | 560 to 600 | +0.12em, uppercase | Readouts, labels, reason codes. The only uppercase on the site. |
| Figures | 88 | 600 to 640 | −0.02em, tabular | Every number that changes |

Fluid scale with `clamp()`: HUD 11–12, Small 13–14, Body 16–18, Lead 20–26, H3 28–40, H2 40–72, H1 56–128, Display up to 22vw, Bleed up to 32vw. Curly quotes and apostrophes everywhere. Money in Indian grouping (₹1,20,000) through `Intl.NumberFormat("en-IN")`.

### The axes are interactive

- **Proximity.** Large headlines gain weight and width as the cursor approaches, sprung, within about 240 px ("Let's talk." on contact, the home chapter titles).
- **Fit to width.** Team names and chapter words solve for the exact `wdth` that fills their measure, so a four-letter name and a twelve-letter name both span the screen without scaling.
- **Data.** On the Understand station, each behaviour label's weight is its intent points.

### Delivery

One self-hosted WOFF2, subset with fontTools to Basic Latin, Latin-1 punctuation, ₹, arrows and ×, with both axes kept. It is loaded with `next/font/local` and preloaded, with a budget of 75 KB. This replaces v1's four Google-hosted families, and with them the font bytes that held v1's mobile LCP at 4 to 5 seconds.

## Grid and spacing

- **Grid:** 12 columns. Outer margin `clamp(16px, 4vw, 72px)`, gutter `clamp(12px, 1.6vw, 28px)`, content up to 1760 px. Ultrawide screens get wider margins, not wider text.
- **Spacing:** a 4 px base and a scale of 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192 and 256.
- **Breaking the grid:** only for scale (bleed type) and overlap (devices crossing column lines).

The fullness checklist runs on every viewport:

- one focal object;
- three depth layers: a world behind (3D, usually out of focus), a subject, and foreground detail;
- at least three secondary details that are true, such as a timestamp, a reason code, a coordinate, a tick scale, a counter or a caption;
- nothing floating without a frame, a line or a shadow to sit on.

Large empty areas are allowed only as a deliberate pause between two dense moments.

## Materials and light

| Material | Built from | Settings to start from |
|---|---|---|
| Green glass | `MeshPhysicalMaterial` with transmission | transmission 1, IOR 1.45 to 1.5, roughness 0.06 to 0.14, thickness 2 to 5 units, attenuation colour Ground deep at a distance of about 6, dispersion 0.015, clearcoat 0.6 |
| Brushed metal | `MeshPhysicalMaterial` | metalness 1, roughness 0.32, anisotropy 0.7 from a generated anisotropy map, colour Raised |
| Matte forest | `MeshStandardMaterial` | roughness 0.9, colour Ground or Surface, baked contact shadows |
| Lumen liquid | custom shader | emissive Lumen at 2 to 6 (HDR), flowing noise along the duct's length, fresnel rim, the only thing that blooms |

**Light.** No downloaded HDRI. A procedural studio environment (drei `Environment` with `Lightformer` softboxes, tinted Khaki light and Cream) gives glass and metal crisp, product-shot reflections, costs nothing to download, and keeps the brand's colour in every highlight. Lumen is the only emitter in each scene.

**Post-processing**, with restraint:

- bloom with a threshold that only Lumen crosses;
- depth of field whose focus is driven by scroll;
- SMAA;
- grain at 3 to 4 %;
- a light vignette.

**No pixelation.** DPR is clamped to 1 to 2 (1.5 on phones), MSAA is on where the GPU has it, textures use linear filtering with anisotropy, and nothing renders below 1× except the transmission buffer on the lowest tier, which is upscaled with linear filtering.

## Motion

| Token | Curve or spring | Use |
|---|---|---|
| `snap` | `cubic-bezier(0.62, 0, 0.06, 1)`, spring 600 / 38 / 0.6 | The decisive move: a reticle locks, a clamp closes, a switch throws |
| `glide` | `cubic-bezier(0.2, 0.84, 0.16, 1)` | Entrances, camera arrivals |
| `cut` | `cubic-bezier(0.6, 0, 0.84, 0.24)` | Exits, which accelerate away |
| `drift` | `cubic-bezier(0.38, 0, 0.22, 1)` | Long scroll-linked moves |
| `pour` | `cubic-bezier(0.45, 0, 0.15, 1)` | Liquid: the route wipe, fills, the relit pipe |
| `dock` | spring 210 / 22 | Team thumbnails, carousels |
| `float` | spring 120 / 14 | Device tilt and parallax |
| `magnet` | spring 300 / 20 | Magnetic buttons |

**Durations:** 120 ms (feedback), 240 ms (UI), 480 ms (panels), 720 ms (HUD assembly), 900 ms (route wipe). Chapter moves are scroll-linked and have no fixed duration.

**Stagger:** 24 ms per character in decodes, 40 ms per line, 70 ms per HUD panel.

**Rules:**

- One dominant motion per viewport.
- Scroll tells the story; time answers input.
- Every section has a choreographed exit as well as an entrance.
- Nothing uses the same fade-up as its neighbour.
- Reduced motion replaces travel with crossfades and still compositions. Every control keeps working.

## Interaction map

Every interaction changes something the visitor cares about. Each one has hover, focus, active and disabled states, a cursor label and a keyboard path.

| Interaction | Where | What it changes | Cursor label |
|---|---|---|---|
| Drag-to-scrub playhead | `/product` rail: Aarav's 20 minutes scrubs the whole machine. `/studio`: the how-we-work timeline and the content calendar. | Which moment of the shopper's journey every station shows | Scrub |
| Physics: grab, throw, stack | `/product` Identify. Event tokens are rigid bodies (Rapier); throw them at the consent turnstile. | Without consent they bounce off and stack up; with it they pass and merge into one profile | Drag |
| Sliders driving live 3D or data | `/product` Understand: behaviour sliders lift the intent terrain. `/product` economics. `/studio` website inspector. | Terrain height, the money model, a live mini-site | Drag |
| Toggle with consequences | `/product` Identify: WhatsApp consent, off by default. Measure: holdout size. | Off physically blocks every send downstream. STOP withdraws it instantly. | Tap |
| Press and hold | `/` Leak: hold to clamp a crack, which tightens as you hold, with haptics. `/product`: hold "send without consent" and the machine refuses. | The stream recovers. The refusal is the lesson. | Hold, with a progress ring |
| Lens or x-ray cursor | `/` hero: a glass lens refracts the logo. `/product` Collect: an x-ray over the storefront shows the events under it. | What you can see | View |
| Drag tokens onto a decision board | `/product` Decide: drop events onto the switchyard tracks | Sent, held for quiet hours, suppressed, or held out | Drag |
| Variable type that reacts to the cursor | `/contact` "Let's talk.", home chapter titles, team names | Weight and width | none |
| Tilt and parallax with springs | Every device, the team hologram | Depth | none |
| Magnetic buttons, nav hover previews, a draggable marquee | Global CTAs; the menu previews each page's signature; the home marquee of real reason codes and playbook names, dragged with inertia | Navigation | Open, Drag |
| Command palette | `Ctrl` or `⌘` K: routes, chapters, sound, motion, performance mode, copy email, book an audit | Anything | none |
| Shortcuts | `M` menu, `/` palette, `?` help, `S` sound, `Esc` close | | |
| Sound, off by default | Synthesised lock, scan, decode, drip, pour, tick | Feedback | |
| Haptics | `navigator.vibrate` on clamp, lock, send and confirm, where supported | Feedback | |
| Easter eggs | The playable 404. Type "holdout" anywhere and the page tells you you've been in the control group all along. | Delight | |

## The device system

Built once and used everywhere: `InteractivePhone`, `InteractiveTablet` and `InteractiveLaptop`. All are generic hardware with no brand marks. Each is a real, working UI, not an image.

**InteractivePhone** runs a generic chat app drawn from scratch. It has its own icons and bubbles and does not use the WhatsApp logo. It contains:

- **A header** with the business name, an avatar mark, and a three-dot menu that opens a real sheet ("Track my order", "Help", "Mute", "Stop messages").
- **Bubbles** with timestamps and delivery ticks that step from sent, to delivered, to read.
- **A typing indicator.**
- **Buttons:** quick replies, plus action buttons inside messages: Retry in one tap, Pay by UPI, Cash on delivery, Confirm, Cancel.
- **An in-chat order card** and a catalogue card.
- **A real text input** that sends.

A typed state machine runs each flow from the report:

- cart recovery;
- the payment-failed rescue: UPI timeout, retry, then switch to UPI or COD;
- COD confirmation;
- back-in-stock;
- post-purchase tracking;
- the review request.

Free text gets an in-character reply from a keyword router; there is no AI in the loop and the site doesn't claim any. Outcomes feed the page. Completing a rescue raises a session-wide "recovered on this visit" counter, which also shows in the footer, and opens a panel of the exact events the dashboard would record. STOP works the way the report says it must: instantly, and for good.

**In 3D,** screens are real DOM mapped into the scene (drei `Html` with `transform` and `occlude`). They tilt with springs, can be dragged to rotate, and stay fully clickable. New messages arrive with a notification drop.

**Flat mode** is used under reduced motion, in the no-WebGL fallback and on small screens. On a 390 px phone the visitor's own screen becomes the phone: the chat goes frameless and full-bleed, because a phone drawn inside a phone is too small to use.

The tablet and laptop carry the storefront (Collect), the dashboard (Measure), the website inspector and the assembled site (Studio).

## Page by page

### Home: The Leak

- **Hero.** The giant logo, exact and Khaki on Ground, spans about 86 % of the width.
  - The cursor carries a glass lens that refracts and slightly disperses the letterforms beneath it. Everything outside the lens stays exact.
  - Behind the logo, the pipe network waits deep in Abyss fog, out of focus.
  - In the foreground: the chapter rail on the right, Hyderabad time, 17.385° N 78.487° E, and the first line of copy.
- **1. The flow.** The logo's strokes extrude into glass, light starts to run inside them, and the camera drops in alongside the S.
  - Drops enter from a storefront on a laptop and run the S with motion blur and depth of field.
  - Junctions carry the report's real event names on leader lines: `product_view`, `size_chart_open`, `add_to_cart`, `checkout_started`.
- **2. The leaks.** At the Y the payment arm cracks, and each crack is labelled with its reason code: `UPI_TIMEOUT`, `BANK_DECLINE`, `INSUFFICIENT_FUNDS`, `USER_CANCELLED`.
  - Drops fall through, dim and vanish. Time slows.
  - The visitor presses and holds a crack to clamp it. Each clamp is a playbook: retry link, switch to UPI, switch to COD.
  - A simulation counter, labelled as a simulation, shows the stream recover.
- **3. One shopper.** The camera follows one falling drop. It lands as a notification on Aarav's phone, which rises into the scene, and the visitor runs the payment-failed rescue themselves.
  - Aarav is shown through his phone, first person, and never drawn. That avoids stock photos and invented faces.
- **4. The recovered stream.** The camera pulls out. The clamped arm relights in Lumen and the report's illustrative case resolves, labelled illustrative: 80 recovered orders, ₹1,20,000 gross, about ₹72,000 incremental after the holdout, about ₹54,400 net of fees.
- **5. The studio.** The camera keeps pulling back until the whole network is visible from above and turns out to be the SCYTE wordmark. Copy hands off: Scyte builds the machine and the storefront in front of it.
  - Then come three workbench previews (website, apps, social) and the product CTA.
- **Footer.** A giant exact logo revealed by parallax as the page lifts away.

### Product: The Machine

A pinned, scrubbed sequence. The rail is Aarav's 20 minutes, and its playhead can be dragged to scrub the whole page.

1. **Collect: exploded view.** The storefront on the laptop comes apart into floating layers:
   - the product image (an illustration, not a photo);
   - the size chart;
   - the reviews;
   - the buy button.

   Each layer emits its event token, then the store reassembles. The x-ray lens shows the event layer under the live store.
2. **Identify: rigid-body physics.** A brushed-metal turnstile with a consent switch, unticked by default.
   - Tokens are Rapier bodies you can throw and stack.
   - Without consent the turnstile is locked and tokens pile up.
   - With consent they pass, and the anonymous ID merges into one masked phone number.
   - Holding "send without consent" makes the machine refuse.
3. **Understand: displaced terrain.** A smooth, lit heightfield with Khaki contour lines, whose height is the intent score.
   - Sliders: engaged time, size chart opened, reviews read, a repeat view within 24 hours, add to cart, checkout started.
   - Dropped tokens raise peaks, and scores decay over time.
   - A glass threshold plane marks "worth a message". Peaks that cross it glow.
4. **Decide: the switchyard.** A crisp SVG railway yard.
   - Drag event tokens onto tracks.
   - Switches are frequency cap, quiet hours, suppression and holdout, each with example values labelled as examples.
   - The token runs the track to its outcome.
5. **Send: the device bank.** Five interactive phones on an arc in 3D, each receiving a different playbook as the scrub passes its moment. Any of them can be picked up and used.
6. **Measure: the split world.** Two parallel renders of the same stream, messaged and holdout.
   - A luminous difference layer, a shader comparing the two, shows only the incremental light.
   - The holdout control widens the uncertainty band as it shrinks, because a smaller control is less certain.
   - Then come the economics model (orders, AOV, messageable carts, order rate, incremental share, software fee, contribution margin, holdout size; all illustrative), the playbooks as a navigable system with payment-failed and COD given the most room, and the dashboard in full code on sample data, labelled as sample.

### Studio: The Assembly

- **First viewport, one plain sentence:** "Scyte designs and builds websites, mobile apps and social media for brands. We work from Hyderabad." The three service names sit under it, so nobody has to guess what the page is about.
- **The assembly.** A real website builds itself as an exploded stack of planes in 3D: wireframe, type, colour, motion, code, deploy. Each plane is the actual layer of the same mini-site, with labels and a live build readout. At the end the stack collapses into the finished page on a laptop.
- **Three workbenches:**
  - **Website:** an inspector panel whose sliders change a live mini-site's type (Archivo's axes), colour (within the palette) and motion.
  - **Mobile apps:** an interactive phone running a prototype app, labelled as a prototype and not client work, with real navigation, swipes, a tab bar and pull to refresh.
  - **Social media:** a content calendar you scrub, with the feed on a phone updating as posts move from planned, to designed, to scheduled, to published.
- **How we work:** a draggable timeline with a playhead.
- **What you get:** crisp deliverables per service.
- **Placeholders:** timelines and prices are `[CONFIRM]`.
- **Ending:** a start-a-project path that preselects the service on `/contact`.

### Team: The Scan

- **Structure from the reference.** Thumbnails sit near the top, a giant word sits beneath, and hovering or focusing a member changes everything.
- **Default state.** The exact logo at enormous scale, with a slow attract mode that targets members in turn until the visitor takes over.
- **On hover or focus:**
  - The thumbnail lifts and magnifies on the `dock` spring while its neighbours part.
  - A fine, segmented bright-line reticle snaps onto it.
  - The giant word cross-slices on the logo's 5-unit grid into the member's name, in Archivo at width 62 and weight 900, solved to fill the width exactly.
  - The portrait becomes a full-bleed hologram.
- **The hologram.** A depth map per photo, made at build time, drives a fine dot matrix and wireframe contour lines. A scan sweep resolves them into the real photo, with parallax to the pointer.
- **Around the portrait.** Hairline frames (0.5 to 1 px), corner brackets and leader lines draw out to the panels:
  - codename and name, role, location;
  - a bio that types out;
  - skills as segmented arcs;
  - currently, tools, a quiet waveform;
  - a prominent **Visit portfolio** action, or a disabled "Portfolio coming soon".
- **Dossier.** Click or Enter opens the full dossier through a shared-element transition.
- **Accessibility.** Focus does what hover does. Arrows move between members, Escape closes, and an `aria-live` line announces the selection. Reduced motion swaps the effects for clean fades.
- **Touch.** A tap selects. The thumbnails become a snapping carousel and the HUD becomes a bottom sheet, designed for the phone rather than shrunk to fit it.
- **Data only.** Adding a person means dropping `public/team/<slug>.jpg` and adding one object. A script makes the thumbnails, the depth map (a monocular depth model, with a luminance height-field fallback) and the dominant colour. The layout holds 4 to 14 people.

### Work: The Archive

- **Gallery.** A horizontal inertia-drag gallery in WebGL. Planes bend with drag velocity and ripple like liquid under the cursor. Project pages open through shared-element transitions.
- **Content.** None has been supplied, so every slot is a designed empty state that says what a case needs: the project, what was built, and one result that can be checked.
- **The original videos.** The five videos from the original site looked like recordings of other studios' sites, so they stay in `archive/`. If any of them is Scyte's work, it goes straight back in.

### Contact: The Conversation

- **The chat.** An interactive phone asks a short conversation, Scyte replying in a human voice:
  1. what you need;
  2. your store address;
  3. your monthly revenue range;
  4. what hurts most;
  5. how to reach you.

  Answers are tappable quick replies or typed text, and it ends with a confirmation.
- **The form under it.** Beneath the phone sits one real, accessible `<form>`, which the chat fills field by field as you answer. You can see exactly what we will receive. It works without JavaScript and is the direct path for screen readers.
- **Beside it:**
  - a giant "Let's talk." whose weight and width follow the cursor;
  - the live Hyderabad clock;
  - click-to-copy email with a micro-confirmation;
  - the 20-minute store audit explained: before the call, on the call, after.
- **Privacy copy, kept true.** Today nothing on the site sends data anywhere until you press Send, and then it goes only to Scyte's inbox. If an analytics tool is ever connected, the copy changes with it.

### 404: The Lost Drop

A pipe puzzle on the logo's grid:

- Rotate tiles to route the lost drop from the broken address to the home drain.
- When the path connects, Lumen flows and the page offers the way home.
- Arrows move between tiles and Space rotates.
- A plain "Take me home" link is always visible.

### Global

- **Menu.** It drops as five tall glass columns, the logo's strokes, which fill with liquid. Each column is a route with a live preview of that page's signature.
- **Chrome:**
  - a persistent chapter and scroll rail drawn as an instrument tape;
  - a sticky, magnetic "Book a store audit" (hidden on `/contact`);
  - a multi-state cursor whose labels are the verbs of the action.
- **Route changes.** A Khaki liquid wipe with a Lumen meniscus covers the page, then drains. Each route then plays its own intro.
- **Scroll.** Lenis and ScrollTrigger run on GSAP's single ticker, with scroll restoration per route.
- **States:**
  - designed focus rings (2 px Cream on a 2 px Ground offset);
  - toasts in hairline frames, announced politely;
  - loading lines that draw;
  - designed empty states.
- **Visitor switches.** Visible switches for performance (Auto, Low) and reduced motion, kept in the menu and the palette and remembered per visitor.

## What we looked at, and what we borrow

**v1's research** (in git history), all live in Chromium with scripted scroll:

- igloo.inc, emotion-agency.com, Lusion, Active Theory, Basement Studio, Darkroom Engineering, Immersive Garden, Cuberto, Obys, Unseen Studio, Resn, Makemepulse and Territory Studio;
- the Awwwards Sites of the Day list;
- the Skiper UI recording, frame by frame.

**Round 2 additions:**

- **Live captures** of landonorris.com and messenger.abeto.co (both tagged Site of the Year 2025 on Awwwards listing pages), with igloo.inc and lusion.co again, logging their libraries and assets.
- **Territory Studio's** film-UI interviews on Pushing Pixels.
- **Real instruments:** rangefinder bright-line frames and aircraft flight-display tapes.

We borrow principles, never pixels. No code, shader, layout, asset or copy is copied.

| # | Principle, and where it was seen | Where it lands | Our twist |
|---|---|---|---|
| 1 | **One variable sans does every job.** landonorris.com sets everything in Mona Sans Variable plus one signature script. | All type | Archivo's width becomes a data channel: names fit exactly, intent sets weight. |
| 2 | **A monochrome world where the material does the talking.** igloo.inc: frost, ice and glass with dispersion, near-monochrome. | Every 3D scene | Light appears only where money moves. |
| 3 | **A hero object lit like a product shot.** landonorris.com lights its helmet with a studio HDR. | Devices and glass | Procedural softboxes tinted Khaki light: no HDR download, and the brand colour sits in every highlight. |
| 4 | **A physical toy the cursor pushes.** Lusion's pile of tube joints. | `/product` Identify | The physics obeys a rule, consent, and the rule is the lesson. |
| 5 | **A tiny world you can play in.** messenger.abeto.co. | 404 | Solving the puzzle is the navigation. |
| 6 | **UI micro-motion as a system.** landonorris.com ships separate Rive files for buttons, phrases and page transitions. | Buttons, wipe, intros | Built in code from shared tokens, so it stays small and consistent. |
| 7 | **One continuous camera through one world.** igloo.inc. | `/` | The world is the logo, revealed at the end. |
| 8 | **Slice-swapped words.** The Skiper UI recording. | `/team` | Cuts on the logo's 5-unit grid; names fitted to width with the variable axis. |
| 9 | **Story-first, grid-based film UI.** Territory Studio: the design has to tell the story, built on predesigned grids. | Team HUD, station labels | Only real fields, hairlines, Khaki on green, no cyan. |
| 10 | **Bright-line frames that snap to a subject.** Rangefinder viewfinders. | Team reticle, the x-ray lens | The frame lines correct for parallax as the hologram turns. |
| 11 | **Tape scales and bugs.** Aircraft flight displays. | Chapter rail, sliders, gauges | On `/product` the tape is Aarav's 20 minutes. |
| 12 | **A fixed lens the list scrolls through.** Obys. | Playbooks | The lens is a phone, so the playbook in it runs live. |
| 13 | **Press and hold as a weighted act.** Resn. | Leak clamps, consent override | One hold fixes, the other is refused. |
| 14 | **A cursor with states and magnetic targets.** Cuberto. | Global | The labels are the verbs (Drag, Tap, Scrub, Open, Hold), and Hold shows its progress. |
| 15 | **Silence between dense moments.** emotion-agency, Immersive Garden. | Khaki bands | The rest is where the subject changes. |

## HUD craft

The team page has to feel expensive, not busy.

- **Lines:** hairlines only (0.5 px on 2× screens, 1 px on 1×).
- **Panels:** they draw their frame first, then decode their text from the final string's own characters.
- **Colour:** at most one Lumen element at a time, the live target.
- **Scales:** tick scales use real units (degrees of hologram rotation, seconds since lock).
- **Layout:** panels align to the 12-column grid. Leader lines run at 0° or 45° only, which are the logo's own angles.
- **Restraint:** no rotating rings, glitch or hex noise, and no fake telemetry. If a number is on screen, it measures something.

## Copy voice

Direct, dry, concrete and Indian ecommerce. Sentence case, no exclamation marks, no filler.

The brief's own lines, used sparingly:

- "Your shopper didn't leave. Their UPI timed out."
- "Fewer messages. Better timed. Provably yours."

Our own lines:

- "Every leak has a reason code."
- "Most dashboards call it abandonment. The gateway calls it UPI_TIMEOUT."
- "A failed payment is a shopper with their wallet still open."
- "Five seconds after the payment fails, the fix is on their phone."
- "Cash on delivery is a maybe. Confirm it before the parcel leaves."
- "Ask first. Stop the moment they say stop."
- "One in ten shoppers hears nothing from us, on purpose. That's how you know the other nine worked."
- "Aarav still wants the hoodie."
- "We build the machine, and the storefront in front of it."
- "This page leaked. Route it home."

## Architecture and performance

- **One fixed canvas for the whole site.** It holds a registry of route-keyed scenes, each lazy-loaded as its own chunk. Shared resources (environment, materials, the post-processing chain, the glass logo) persist, so a route change can carry an object across pages.
- **Clock.** `frameloop="never"`, advanced from GSAP's ticker, the same single clock as Lenis and ScrollTrigger.
- **Load order:**
  1. real HTML and the SVG logo paint first;
  2. the font is preloaded;
  3. the WebGL core loads at idle on capable desktops and at first interaction on touch and low-power devices;
  4. scene chunks load when their section is a viewport away;
  5. Rapier loads only for the Identify station.

  The preloader counts real tasks.
- **Budgets:**
  - home JS before WebGL: 170 KB gzipped or less;
  - font: 75 KB;
  - each scene chunk: 60 KB or less, not counting Rapier;
  - fewer than 120 draw calls per scene;
  - LCP under 2.5 s, CLS near zero;
  - Lighthouse 90 or above on desktop, and as high as honestly reachable on mobile.
- **Adaptive quality.** drei's `PerformanceMonitor` steps down in this order:
  1. grain and vignette off;
  2. depth of field off;
  3. bloom resolution halved;
  4. transmission samples and resolution down;
  5. DPR down;
  6. glass swapped for a cheaper refraction shader.

  Effects degrade before layout ever does.
- **Assets.** Geometry is procedural or built from the logo's own outlines, so there are no models to download. If a GLB or large texture is ever added, it goes through `@gltf-transform` with Draco or Meshopt and KTX2. Team photos ship as AVIF or WebP for the DOM, with KTX2 copies for the hologram.
- **No-WebGL fallback.** Every scene has a designed still or SVG version. Every control is DOM anyway (phones, switchyard, sliders, economics, form), so the site still works.
- **Engineering.** Everything is Strict Mode safe and cleans up on unmount. Resize and orientation changes rebuild layout and cameras live.

## Kept from v1, removed from v1

**Kept:**

- routes and the 404;
- `geometry.ts`, the logo SVG, `npm run logo:verify` and the icon build;
- the contact server action, its zod schema and the mail provider;
- metadata, OG image, sitemap, robots and JSON-LD;
- the team schema, extended with the brief's fields;
- the preloader's task counter;
- the Lenis and GSAP ticker setup;
- the economics model and the report-derived data files;
- the sound engine, with new sounds;
- the analytics stub;
- the accessibility patterns.

**Removed:**

- the event-pixel field and every halftone;
- Big Shoulders, Big Shoulders Stencil, Newsreader and Martian Mono;
- the red signal and the paper sections;
- the cell curtain and cell cursor;
- the visit readouts, the proof stack and the v1 consent demo.

## Truthfulness

- **Numbers.** Every figure comes from the report and is labelled "illustrative" where the report says so. Simulations are labelled as simulations, and sample data as sample.
- **Placeholders.** They are visible: `[ FILL ]` for people, `[CONFIRM]` for studio terms, and `PRODUCT_NAME = "[BRAND NAME]"` in one constant.
- **Facts not printed.** WhatsApp prices and DPDP dates stay in `VERIFY_BEFORE_PUBLISHING` and are not printed as fact.
- **No inventions.** No competitor names, no WhatsApp logo, and no invented clients, results, testimonials, bios or counts.

## What we refuse

From the brief, and from what a first draft of ours would reach for:

- **Decoration:** gradient orbs and blurred blobs, glass cards, pill badges, rounded and shadowed cards as the default container.
- **Template layouts:** centred gradient heroes, three-column icon grids, bento as a crutch.
- **Fake content:** emoji icons, stock photos, lorem ipsum, fake logo strips, fake testimonials, invented statistics.
- **Filler copy:** unlock, elevate, seamless, supercharge, next-level.
- **Lazy motion:** the same fade-up on every element.
- **v1's mistakes:** particle backgrounds, a pixelated look, cyan HUDs, a second typeface.

## Decisions taken without asking

- `/services` becomes `/studio`, with a redirect.
- Aarav appears only through his phone, never drawn as a person.
- Lighting and materials are procedural. No Figma AI credits are spent unless you ask.
- The five original videos stay archived until someone confirms they are Scyte's work.

## Needs a yes before the build

1. **Archivo** as the one family. The runner-up is Mona Sans, if you don't mind sharing a face with the Lando Norris site.
2. **Lumen `#F9DC7D`.** It is the only colour not taken from the original site. Without it, emitted light falls back to Cream.
3. **A depth model for real team photos.** Depth Anything V2 Small, Apache-2.0, run through onnxruntime at build time. It is a 25 to 100 MB download from Hugging Face depending on precision. Without it, photos use the luminance height-field, which is what the placeholders use anyway.
4. **The LinkedIn URL** carried over from the old site is `linkedin.com/in/scyte-undefined-056131412/`. It needs the correct address.
