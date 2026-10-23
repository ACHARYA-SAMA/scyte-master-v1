# Set pieces, round 3 (version 1: the plan)

Every page becomes a run of set pieces. Each is a pinned or full-viewport scene with one subject, one primary technique and at least two kinds of interaction. This file is the manifest. Each entry gets its proof (screenshot, recording, density score) as it is built in Round C. Until then the proof column reads *pending*.

The weaknesses these answer are ranked in [`baseline-critique.md`](baseline-critique.md).

## How to read an entry

| Field | Meaning |
|---|---|
| **Subject** | The one thing the viewport is about. It is also the focal object. |
| **Technique** | The primary technique, then any secondary one in brackets. The primary is what the diversity rule counts. |
| **Interactions** | Two or more kinds, each with a keyboard path. |
| **Idle** | What happens three seconds after the visitor stops (attract mode). Any input hands control back at once. |
| **Mobile** | The phone design. It is redesigned for a thumb, not the desktop layout shrunk. |
| **Reduced** | What `prefers-reduced-motion` gets: the same information, standing still. |
| **Proof** | Filled in Round C: `docs/proof/<id>.png`, `docs/proof/<id>.webm`, and the density score from `scripts/qa-density.py`. |

**Technique codes.** GL is a WebGL scene, GLSL a custom shader as the subject, INST instanced meshes and RTT render-to-texture or video textures. RB is rigid-body physics (Rapier) and VR verlet rope. SPR is spring physics. PIN is a scrubbed pinned timeline. SVG is path drawing and morphing. C2D is canvas 2D. FLIP is FLIP layout animation and VT View Transitions. VF is variable-font axis animation. C3D is CSS 3D. MASK is mask and clip-path reveal. AUD is audio-reactive.

**Rules checked per page.** No primary technique more than twice. No two adjacent set pieces share a primary. Every set piece passes the density audit: at least 70 percent of a 12 × 8 grid holds content, texture or motion at 1440 × 900. Each page allows at most one deliberate pause.

---

## Each page is its own world

The six pages share one system: the palette, Archivo, the Instrument Frame, the cursor and the chat engine. Each page then has its own world, material, verb, sound bed and grade arc, so no two feel alike.

| Page | World | Material | The verb | Sound bed | Grade arc (scroll) |
|---|---|---|---|---|---|
| Home, The Leak | Plumbing inside the logo | Dark green glass, Lumen liquid | **Hold** (clamp a leak) | Dripping room, glass clinks | Deep green → warm yellow-lit as the story resolves |
| Product, The Machine | A glass factory line that ends in a control room | Machined dark metal, glass, receipt paper | **Pull and turn** (levers, knobs, cables) | Relays, ratchet detents, printer chatter | Cool intake green → warm control-room light at the lever |
| Studio, The Assembly | A workshop where objects are made | Blueprint line, x-ray, finished surfaces | **Inspect** (x-ray, morph, switch devices) | Soft keys, shutter, tool clicks | Blueprint green → finished, lit product |
| Work, The Archive | A film vault and a lab bench | Projected light, reels, wireframe | **Play** (drag the reel, run the toys) | Projector hum, toy sounds | Dark vault with one warm beam |
| Team, The Scan | A classified dossier room | Phosphor hairlines, hologram | **Lock on** (target, scan) | Scan blips, radar tick | Cold phosphor green, restrained |
| Contact, The Conversation | A correspondence desk at night in Hyderabad | Phone glass, receipt paper, rubber stamp | **Send** | Typing, paper feed, stamp thunk | Evening green → lamp-lit warm |
| 404, The Lost Drop | A broken pipe | Glass, Lumen | **Catch** | Drips | Dark → lit when solved |

---

## Global systems (Round D, built once, everywhere)

| ID | System | What it is | Notes |
|---|---|---|---|
| G1 | **Instrument Frame** | A hairline frame inset around the viewport. Its edge rulers carry ticks that scroll with the page. Four corner readouts show the section name, the scroll percent, cursor coordinates, and a frame counter that reports the real frame rate. A chapter strip runs along the bottom. | Crisp, in Line and Khaki. On phones only a slim top and bottom strip stay. It takes over the chapter rail's job; Product keeps Aarav's draggable timeline (P1). |
| G2 | **Transitions** | Six transitions, chosen by destination. → Product: a liquid yellow wipe. → Studio: an iris through the logo's cutout. → Work: a fold of layered planes. → Team: a rack-focus dissolve. → Contact: a scan-line sweep. → Home: a pipe fill. | The logo, the nav and the phone persist across routes as shared elements. Reduced motion gets a 150 ms cross-fade. |
| G3 | **Cursor** | Context labels (Drag, Tap, Hold, Scrub, Open, Turn, Pull). The shape changes per component. CTAs pull magnetically; the team scan shows a lock-on reticle; rotary controls show a knob arc. The cursor hides over inputs. | Touch gets `navigator.vibrate` where supported. The current trailing lamp is removed (the brief bans cursor-following light). |
| G4 | **Sound** | Synthesized Foley: glass clink, relay clunk, ratchet detent, split-flap clatter, receipt chatter, scan blip, and a room tone that shifts per page. | Off by default behind the toggle. Nothing autoplays. |
| G5 | **Command palette** | Ctrl K jumps to any set piece by name, toggles sound and reduced motion, copies the email, starts a contact intent, runs a demo phone, opens the passport, and holds a few hidden commands. | Reads its list from this manifest's data file. |
| G6 | **Stamp passport** | One hidden stamp per page, collected into a passport panel stored in `localStorage`. Finding all of them unlocks Lumen mode: a golden-hour grade, and glass letters in the footer logo. | Nothing is sent anywhere. The footer claim becomes "No cookies, no trackers. Stamps you collect stay in this browser." |
| G7 | **Scroll grade** | A CSS variable plus a grade pass in the post chain, so the DOM and the canvas warm together along each page's arc. | The grade only shifts warmth inside the palette. It adds no hues. |
| G8 | **Attract mode** | After three seconds still, every visible set piece runs its idle behaviour. | One shared idle clock (`src/lib/idle.ts`), so scenes do not each poll input. |
| G9 | **Route loaders** | A 400 to 900 ms intro per route, tied to real readiness: fonts, the route's scene chunk and its shaders compiled. | It never waits longer than the work, and is skipped when everything is cached. |
| G10 | **Playable logo** | The footer wordmark's letters are rigid bodies extruded from the traced SVG paths. Grab, throw and stack them; after four seconds at rest, or on a button, they settle back into the exact logo. | Rapier loads only when the footer nears view. The resting state is the verified SVG, swapped back in. |

### Where the stamps hide

| Page | Stamp | How it is found |
|---|---|---|
| Home | Plumber | Seal every leak in chapter two |
| Product | Operator | Pull the closing lever with every rule patched in the patch bay |
| Studio | Keyboard-first | Finish the manifesto's Tab-path demo without touching the mouse |
| Work | Quick thumb | Beat the stopwatch in the lab |
| Team | Full scan | Run Scan all to the end |
| Contact | Correspondent | Print the receipt preview |
| 404 | Lost and found | Get the drop home |
| Hidden | Night shift | A command in the palette |

---

## Component library (Round B, `/lab/components`)

Built once, typed, keyboard-operable, with hover, focus, active, disabled and reduced-motion states visible side by side. The route is development-only (`notFound()` in production).

| Component | Used by |
|---|---|
| InstrumentFrame | G1 |
| TypeBreather | S1, K1, Home chapter titles |
| LiquidFillText | S9, H2 |
| SplitFlapBoard | H1, P10 |
| OdometerWall | H2, C6, P9 |
| RotaryKnob | P8, P9, S4, W5, W6 |
| LeverSwitch, ToggleSwitch | P3, P9, P13, S5 |
| HoldToConfirm | P5, W3, K3 |
| PatchBay | P5 |
| ReceiptPrinter | P9, K3 |
| CartridgeShelf | P11 |
| ExplodedBubble | P7 |
| PhoneWall | P6 |
| SankeyFlow | P10 |
| DepthHologram | T1, T5, T7 |
| ConstellationGraph | T4 |
| BlueprintSlot | W2 |
| ThrowableCards | T6 |
| BeforeAfterSlider | S8, C4 |
| SpeedRace | S4 |
| ScrubTimeline | P12, C5 |
| Accordion | S10, K6 |
| Toast, StampPassport, CommandPalette | G5, G6 |

---

## Home, The Leak: keep the five chapters, add three set pieces

The five chapters and the glass-logo hero stay exactly as they are; the client signed them off. The additions slot in without touching the scroll story.

| ID | Set piece | Subject | Technique | Interactions | Idle | Mobile | Reduced | Proof |
|---|---|---|---|---|---|---|---|---|
| H1 | **The Postmortem** (between chapters two and three) | A split-flap board listing each failed payment the visitor has clamped: time, amount, reason code, the fix that would recover it | C3D (+ AUD clatter) | Clamping leaks above writes rows; click a row to replay that drop's failure; arrow keys move along the rows | The board flips through sample reason codes, marked *sample* | Four rows, full width, larger flaps | Rows change without flipping | pending |
| H2 | **The Ledger** (chapter five) | The four illustrative figures as an odometer wall. The caption stays: "Illustrative, from our business model. Not a client result." | SPR | Switch the store-size preset (the report's case, smaller, larger), recomputed by `lib/economics.ts`; hover or focus a figure to see its formula | The digits idle-carry by one and settle back | Stacked odometers, two columns | Numbers swap in place | pending |
| H3 | **The Playable Logo** (footer, all pages) | The wordmark as five rigid bodies | RB | Grab, throw and stack; "Put it back" button; keyboard: Space shakes the letters, Enter restores them | Letters settle into the exact logo | Tilt and tap to knock (device motion, with permission) | The static verified SVG | pending |

Also on home: the chapter strip with a droplet tracking progress (G1), and the scroll grade (G7).

---

## Product, The Machine: thirteen set pieces (minimum 10)

The first half deepens what exists. The second half, now tables and sliders, is rebuilt as hardware.

| ID | Set piece | Subject | Technique | Interactions | Idle | Mobile | Reduced | Proof |
|---|---|---|---|---|---|---|---|---|
| P1 | **The Line** | The whole six-station machine as a long glass factory line in perspective cutaway, with Aarav's token on the belt | GL (+ PIN camera dolly) | Hover a station to lift and label it; click to fly there; drag the Aarav rail to move the token along the line; arrow keys step stations | The camera dollies slowly, drops ride the belt, and station lamps fire in sequence | The line turns vertical; swipe between stations | A rendered still with the station list as links | pending |
| P2 | **The Storefront** (Collect) | A working mini store (the fictional hoodie shop) in a browser frame, with the SDK visibly watching | FLIP (+ type-on log) | Scroll inside the store, hover products, open the size chart, pick a size, add to cart. Each action flies an event token from the element into a typewriter log, and engaged time counts up | A ghost cursor browses the store | The store fills the screen, with a bottom event ticker | Events appear in the log without flying | pending |
| P3 | **The Gate** (Identify) | The consent turnstile, tokens piling up behind it, then the identity merge: anonymous IDs converge and zip into a phone-number card, only after consent | RB (+ SVG zip) | A LeverSwitch for consent; throw tokens at the gate; hold to "verify the OTP"; keyboard. The consent choice carries downstream: off, and P5 suppresses the send | Tokens trickle in and the pile settles | Tap to drop tokens; the merge plays vertically | Counted stacks, and the merge as a before and after | pending |
| P4 | **The Terrain** (Understand) | A 3D height field of Aarav's intent. Points raise the peak; a threshold plane sits at 60; decay erodes it | GLSL (displacement, erosion, contour glow) | Toggle signals to raise the peak; a time scrub to watch decay; hover the terrain for a height readout; the readable points list stays, and keyboard toggles drive it | Decay erodes the peak, then a ghost signal re-raises it | A top-down contour map with the list below | Static contours and the numbers | pending |
| P5 | **The Patch Bay** (Decide) | Rule nodes (consent, suppression, holdout, frequency cap, quiet hours, template) and event jacks, joined by rope cables. Cargo tokens ride rails through junction switches; a trace log records each run | VR (+ SVG rails) | Drag cable plugs to jacks; flip junction switches; HoldToConfirm to run; keyboard: select jack, select rule, Enter to patch | A token runs the current patch every few seconds; the cables sway | A fixed patch with tap-to-toggle rules and fewer cables | Straight cables, log only | pending |
| P6 | **The Phone Wall** (Send) | Five working phones (cart, payment-failed, COD, back-in-stock, review) in a 3D arc | C3D (+ SPR pick-up) | Drag to turn the arc; click to pick up a phone, which comes forward fully interactive on the chat engine; arrow keys | Phones receive messages in turn | A swipeable stack, one phone at a time | A row of phones | pending |
| P7 | **The Anatomy** | One WhatsApp-style template message exploded into labelled parts: header, body, variables, buttons, and the category cost chip | PIN (explode on scroll) | Scrub the explosion; hover or focus a part to explain it; switch utility against marketing, and the chips change, labelled "check current rates", never stated as fact | Parts breathe apart a few pixels; the variables cycle (name, order number) | The parts stack vertically with leader lines | The exploded state, standing | pending |
| P8 | **The Split World** (Measure) | Two crowds as data dots, 1,800 messaged and 200 held out, ordering over the weeks with small flashes. The difference glows, and the 95 percent band is drawn as a living range | INST (+ GLSL difference layer) | A RotaryKnob for holdout size (the band widens when the holdout is small); scrub the weeks; hover a dot for its readout; keyboard | The weeks auto-advance and loop | Two stacked crowds at lower counts | The final state with the band | pending |
| P9 | **The Control Room** (Economics) | Nine RotaryKnobs, a margin LeverSwitch, and a big throw switch for "on margin" against "on revenue". The result is a gauge and a waterfall (incremental, margin, fee, message cost, net). A ReceiptPrinter prints the paper trail | SPR (+ MASK receipt) | Turn knobs (drag, wheel, arrow keys); throw the lever; flip the switch; print and tear off the receipt. The 13-row and 30-row tables move into the receipt and an accessible "data table" disclosure | The needle micro-jitters; one knob demos a slow sweep and returns | A 3 × 3 knob grid with large hit areas; the waterfall turns vertical | No bounce, instant values | pending |
| P10 | **The Instrument Cluster** (Dashboard) | A bank of instruments: a tapering glass funnel, a SankeyFlow, a SplitFlapBoard for per-flow performance, a radar of failure reasons, a sparkline wall, a COD gauge. A permanent diagonal "Sample data" ribbon; every "Live" becomes "Sample" | SVG (+ C3D flaps) | Hover the Sankey to isolate a path; switch the period (7, 30, 90 days) and the board flips; focus walks the instruments; a data-table disclosure | The sparklines tick forward; the board cycles flows | Instruments stack; swipe between them | Drawn, still instruments | pending |
| P11 | **The Cartridge Shelf** (Playbooks and plans) | The ten playbooks as cartridges. Pull one out and it expands into its flow; payment-failed rescue is the flagship, its reason-code tree animating the chosen path. The three plans are cartridges that slot into the machine and light the features they include | FLIP (+ SVG tree) | Pull a cartridge (drag up, or click); flip it to read the back; drag it into the slot, or press Enter; choose a reason code to route the tree | A cartridge half-pulls and returns; the tree pulses its path | A horizontal shelf you swipe; tap to expand | Cartridges open in place | pending |
| P12 | **The Flight Plan** (14 days) | The fourteen-day onboarding as a route that draws itself, with a droplet travelling it | PIN (+ SVG) | A ScrubTimeline with snapping; click a day for its tasks; keyboard steps the days | The droplet loops the route | A vertical route | A list of days | pending |
| P13 | **The Lever** | "Run a pilot": a full-height LeverSwitch. Pulling it lights the whole line from P1 and opens Contact with the pilot intent selected | SPR (+ AUD) | Pull (drag), click, or Space; release early and it springs back | The lever creaks a few degrees | A thumb-sized lever | A button | pending |

**Pricing.** `SHOW_PRICING=false` hides unfilled prices. P11 shows a designed "Pricing with your pilot" state instead, until real numbers are supplied.

**Diversity check:** GL, FLIP, RB, GLSL, VR, C3D, PIN, INST, SPR, SVG, FLIP, PIN, SPR. FLIP, PIN and SPR each appear twice, and none is adjacent to itself.

---

## Studio, The Assembly: ten set pieces (minimum 8)

| ID | Set piece | Subject | Technique | Interactions | Idle | Mobile | Reduced | Proof |
|---|---|---|---|---|---|---|---|---|
| S1 | **The Triptych** | Three large objects in one space, a browser slab, a phone and a feed card, that tilt with the pointer and morph into one another on scroll. The headline is giant TypeBreather type; the subline says plainly what the page is: "We design and build websites, mobile apps and social media for brands." | GLSL (morph, + VF headline) | Tilt with the pointer; scroll to morph; click an object to jump to its workbench; keyboard | The objects orbit slowly; their screens animate (a page scrolls, a chat arrives, a reel plays) | One object at a time; swipe to morph | Three still objects side by side | pending |
| S2 | **The Index** | Big rows: Websites, Mobile apps, Social media, Shopify stores, Performance, Accessibility, Search, No-tracker builds. Each widens on Archivo's width axis on hover and floats a live preview recorded from this site's own scenes | VF (+ RTT previews) | Hover or focus a row to widen it and show its preview; click to open the detail; keyboard | A running light widens the rows in turn | Tap a row to expand it with its preview inline | Still rows, poster previews | pending |
| S3 | **The Assembly** | The six-layer exploded build (kept), plus an x-ray lens, a typed and syntax-highlighted code layer, and, at Deploy, a score card of real Lighthouse numbers and the date they were measured | GL (+ RTT x-ray) | Scrub the layers; drag the x-ray lens over the page to see its code and wireframe; toggle layers; keyboard | The lens wanders and the code types | Layers as a vertical stack, lens by tap | The finished page and its layers listed | pending |
| S4 | **Speed Theatre** | Two phones load two storefronts over a throttled network, with an animated request waterfall. Labelled "Simulation". Ours is this site's measured transfer; the heavy one is a sample page we define, also labelled | C2D | A RotaryKnob for the network (Slow 3G, 4G, fibre) and a CPU throttle; Race; scrub the waterfall afterwards; keyboard | A race runs on 4G every few seconds | The phones stacked, the waterfall below | The final timings as a table | pending |
| S5 | **Website Workbench** | A live demo store with an inspector: type, colour, motion, density, grid overlay, device switcher | FLIP | Inspector controls (knobs, toggles); the device switch and density changes animate the layout by FLIP; the grid overlay; keyboard | The bench demonstrates itself (kept from round 2) | The inspector as a bottom sheet over the store | Changes apply without animation | pending |
| S6 | **App Workbench** | A prototype on a tilting phone: swipe-back, a bottom sheet, a haptics toggle, onboarding | SPR (+ C3D tilt) | Swipe back, drag the sheet, tap through onboarding, toggle haptics (`navigator.vibrate`); keyboard | The prototype walks itself through onboarding | The phone fills the screen; it is the app | No tilt or overshoot | pending |
| S7 | **Social Workbench** | Drag the month across a calendar, plus a reel player with captions animated word by word and an analytics sparkline | MASK (captions, + SPR drag) | Drag the month; play and scrub the reel; hover a post for its plan | The month plays forward | The calendar becomes a week strip above the reel | Captions shown whole | pending |
| S8 | **The Route** (process) | A horizontal pinned route: design, build, launch, grow, with a droplet travelling it. Each milestone opens a mini scene: a two-option BeforeAfterSlider at review, a deploy countdown at launch. The "We, You, You get" copy lives here | PIN (+ SVG) | Scrub the route; drag the droplet; drag the before/after divider; press launch | The droplet loops | A vertical route | Milestones as a list | pending |
| S9 | **The Manifesto** | Four non-negotiables, filled with liquid as they scroll through, each with a live proof: a contrast checker, a Tab-key path across a mock UI, a reduced-motion switch demo, and a live list of this page's third-party requests (empty, read from the browser's own resource timing) | MASK (LiquidFillText) | Type a colour into the checker; Tab through the mock; flip the motion switch; open the request list; keyboard throughout | The liquid sloshes gently; the Tab path replays | One statement per screen | Statements filled and still | pending |
| S10 | **What You Get** | The three services as stacked sticky panels, each with its own line drawing that draws itself. Timelines and prices render only when real values are supplied; until then each panel shows a designed "Scoped on a call" state. Then an Accordion FAQ, "Questions founders ask", with a chat shortcut | SVG (+ FLIP accordion) | Scroll the stack; open FAQ items; the chat shortcut opens Contact with the project intent; keyboard | The drawings redraw | Panels stack normally | The drawings complete | pending |

**Diversity check:** GLSL, VF, GL, C2D, FLIP, SPR, MASK, PIN, MASK, SVG. MASK appears twice, not adjacent.

---

## Work, The Archive: eight set pieces (minimum 7), plus Case 00 at eight

| ID | Set piece | Subject | Technique | Interactions | Idle | Mobile | Reduced | Proof |
|---|---|---|---|---|---|---|---|---|
| W1 | **The Tunnel** | A curved WebGL tunnel of the eight Case 00 scenes as looping video planes, recorded from the real scenes by `scripts/qa-record.mjs` (no static images) | RTT (+ GLSL ripple) | Inertia drag and wheel; a shader ripple on hover; click for a shared-element transition into the case; arrow keys | The tunnel drifts and the videos play | A vertical swipe deck; posters until tapped, to save data | A grid of posters | pending |
| W2 | **Blueprint Slots** | The three reserved slots as blueprints that draw themselves: a storefront, an app and a feed. Each slot is a different project type | SVG | Hover to annotate dimensions; a magnetic "Claim this slot" that opens Contact with the project intent; keyboard | Each draws, erases and redraws a variant | Slots stack full width | Finished drawings | pending |
| W3 | **Lab: The Stopwatch** | Approve a payment before the clock runs out. The time limit is illustrative and labelled so; it states no bank's real timeout | C2D | Press and hold to approve; Space; retry | The hand sweeps | Full-screen dial | Numbers only | pending |
| W4 | **Lab: Recover the Carts** | Carts tip off a shelf and you catch them before they fall out | RB | Drag and throw; click to nudge; the keyboard moves a catcher | A cart wobbles on the edge | Tilt to steer | A turn-based version | pending |
| W5 | **Lab: Type Specimen** | Archivo, live: width and weight as two RotaryKnobs, a waterfall of sizes, your own text | VF | Turn the knobs; type; pick a sample; keyboard | The axes breathe | Knobs below the specimen | Static specimen | pending |
| W6 | **Lab: Logo Shader Sandbox** | The logo in glass, liquid and slice shaders, with palette swatches you drop onto it. The shape never changes | GLSL | Drag swatches; knobs for the shader; randomise; keyboard | The shader cycles its presets | Fewer controls, bigger logo | Static SVG in the chosen colour | pending |
| W7 | **Lab: Sound Pad** | A 4 × 4 pad of the site's synthesized Foley, with a ring that answers the audio | AUD | Tap pads; play with keys; record a loop | Silent until touched; the ring breathes | The pad full width | No ring animation | pending |
| W8 | **The Door** | Case 00's doorway: hover scrubs a preview strip, and a click opens it through a View Transition | VT | Hover to scrub; click; keyboard | The preview strip drifts | Tap to open | A plain navigation | pending |

The Lab bays (W3 to W7) sit in one pinned horizontal bench, one bay per viewport.

**Diversity check:** RTT, SVG, C2D, RB, VF, GLSL, AUD, VT. No repeats.

### Case 00, `/work/this-site`: the making-of

| ID | Set piece | Subject | Technique | Interactions | Idle | Mobile | Reduced | Proof |
|---|---|---|---|---|---|---|---|---|
| C1 | **The Brief** | What the client asked for in each round, quoted from the real briefs, with hand-drawn redlines marking what changed | SVG | Hover a redline to see the decision; switch rounds; keyboard | The redlines redraw | One round per screen | Marks drawn | pending |
| C2 | **The Thesis** | "Light is money", shown with one drop in a glass duct | GL | Drag the drop; tap to leak it; keyboard | The drop flows | Smaller scene | A still | pending |
| C3 | **The System** | The tokens: the palette, Archivo's two axes, spacing | VF | Drag the axes; click a swatch to copy it; keyboard | The axes breathe | Stacked | Static | pending |
| C4 | **The Scenes** | Eight full-bleed chapters, one per scene, each with a draft-against-final BeforeAfterSlider (real captures from earlier rounds), a wireframe toggle and a code excerpt | MASK (+ SPR divider) | Drag the divider; toggle the wireframe; copy the code; keyboard | The divider swings once | Vertical before/after | Side by side | pending |
| C5 | **The Timelapse** | The build, scrubbed: real screenshots from each round and commit, in order | PIN | Scrub; play and pause; jump to a commit | Plays slowly | Full-width scrubber | A list of frames | pending |
| C6 | **The Numbers** | The measured performance, from `docs/performance.md` and a script, on an OdometerWall plus a table | SPR | Switch desktop and mobile; hover a row; open the raw JSON | The digits settle | Stacked | Table only | pending |
| C7 | **The Wireframe Lab** | The home glass logo, orbitable, with wireframe and exploded views | GL | Orbit; toggle wireframe; explode; keyboard | It slowly turns | Orbit by touch | A still render | pending |
| C8 | **Credits** | A credits roll of the real ingredients: Archivo and its designers, three.js, GSAP, Rapier, Lenis, Next.js, and the people when named | C3D | Scroll or drag the roll; click a credit for its link | It rolls | Flat roll | A list | pending |

**Diversity check:** SVG, GL, VF, MASK, PIN, SPR, GL, C3D. GL appears twice, not adjacent.

---

## Team, The Scan: eight set pieces (minimum 7)

The page has to look intentional with no data at all, and better once data arrives, without code changes. While a seat is unfilled it wears a classified-dossier skin: a generated holographic silhouette, and redaction bars that de-redact on hover to a neutral "Clearance pending". No `[ FILL ]` and no internal wording ("from our plan") appear publicly.

| ID | Set piece | Subject | Technique | Interactions | Idle | Mobile | Reduced | Proof |
|---|---|---|---|---|---|---|---|---|
| T1 | **The Scan** | A curved magnifying dock of thumbnails, the giant slice-swapped name, and the DepthHologram portrait (a silhouette while unfilled) | GL | Hover the dock to magnify; click to lock on (reticle cursor); drag to rotate the hologram; arrow keys | Attract mode targets each seat in turn | The dock becomes a bottom strip; the hologram fills the screen | Portrait stills | pending |
| T2 | **The Readout** | The locked seat's HUD: radar sweep, waveform, an orbiting skill ring, a typed hex ID, coordinates, signal strength, hairline leader lines | C2D (+ SVG leaders) | Hover a readout to expand it; switch channels; keyboard | The radar sweeps and the waveform breathes | Readouts as a column | Static readouts | pending |
| T3 | **Scan All** | A beam sweeps everyone in sequence, then the team assembles into the logo | INST | A button, or S; it can be stopped mid-sweep | — (it is triggered) | A vertical beam | The end state | pending |
| T4 | **Constellation** | The team linked by real projects (this site, the platform). Links appear only where the data says so; unfilled links are dashed and marked pending | SPR (force layout) | Drag nodes; hover to isolate; click for the dossier; keyboard | The graph breathes | Fewer nodes, larger | A list of links | pending |
| T5 | **Dossier pages** `/team/[slug]` | A full-bleed hologram, a timeline, a large skills radar, "currently", tools, and a big magnetic **Visit portfolio ↗** (new tab, `rel="noopener noreferrer"`; a designed "Portfolio coming soon" when empty) | VT (shared element from the dock) | Open and close by View Transition; next and previous seat; keyboard | The hologram turns | Full screen | A plain page | pending |
| T6 | **Rules of the Room** | The team's working principles as cards to throw and shuffle. They are commitments, not claims (keyboard-first, consent before contact, no trackers, ship small) | RB | Drag and throw; shuffle; keyboard picks and sends a card | A card slides to the top | Swipe to throw | A list | pending |
| T7 | **Open Seat** | A vacancy hologram card with "Say hello" | GLSL (hologram) | Hover to resolve the silhouette; click Say hello (Contact, hello intent); keyboard | Scan lines drift | Full width | Still card | pending |
| T8 | **Roster** | Rows that expand to reveal a portrait, with a table-view toggle | FLIP | Expand a row; toggle list or table (FLIP between them); keyboard | — (a pause) | Rows only | No FLIP | pending |

**Diversity check:** GL, C2D, INST, SPR, VT, RB, GLSL, FLIP. No repeats. T8 is the page's one pause.

**Data.** `src/data/team.ts` stays the single source. `scripts/team-assets.py` makes a thumbnail, a depth map (with a luminance height-field fallback) and a dominant colour for any photo dropped in `public/team/`.

---

## Contact, The Conversation: seven set pieces (minimum 7)

| ID | Set piece | Subject | Technique | Interactions | Idle | Mobile | Reduced | Proof |
|---|---|---|---|---|---|---|---|---|
| K1 | **Let's Talk** | A giant "Let's talk." in TypeBreather beside the phone, with three intent cards: Store audit, Project, Pilot. Choosing one flips the card, rewrites the chat script and pre-fills the form | VF (+ C3D flip) | Cursor proximity and scroll velocity drive the type; flip a card; keyboard | The type breathes | The cards become a segmented control above the phone | Still type | pending |
| K2 | **The Chat** | The phone, with realistic typing, read receipts, clearer quick replies, and a language switch (English, Hindi, Telugu, Hinglish) using script-specific font fallbacks. The no-JS form keeps working | SPR | Tap quick replies; type; switch language; keyboard | A message arrives | The phone is the screen | Messages appear without springs | pending |
| K3 | **The Receipt** | A preview of the receipt before sending; on send, a ReceiptPrinter prints the confirmation with a reference number and next steps, then a stamp lands | MASK (paper feed, + VR tear) | Preview; HoldToConfirm to send; tear the receipt off; keyboard | The printer head idles | Full-width receipt | Receipt shown whole | pending |
| K4 | **The Audit, Explained** | Before the call, on the call, after: an interactive three-step with a flippable sample audit report, labelled sample | C3D | Step through; flip the report's pages; keyboard | A page lifts and settles | One step per screen | Pages listed | pending |
| K5 | **Hyderabad** | A stylised map drawn as a WebGL line terrain (no embed), with the pin at 17.385° N, 78.487° E, live local time, and a "likely online" dial from the stated hours. Until the hours are supplied, the dial shows a designed "Hours to be confirmed" state | GLSL | Drag to tilt the terrain; hover the pin; keyboard | The terrain's light moves with the hour | A flat line map | A still map | pending |
| K6 | **Questions** | An Accordion FAQ, copy-email with a micro-confirmation, and "Talk to us on WhatsApp", which renders only when `WHATSAPP_NUMBER` is set | FLIP | Open items; copy; keyboard | — (a pause) | Full width | Instant open | pending |
| K7 | **Sent** | The success state: the stamp, the orders-recovered counter, and a route back into the story | SPR (stamp) | Replay the stamp; choose where to go next; keyboard | The stamp ink dries | Full screen | Still stamp | pending |

**Diversity check:** VF, SPR, MASK, C3D, GLSL, FLIP, SPR. SPR appears twice, not adjacent. K6 is the page's one pause.

---

## 404, The Lost Drop

| ID | Set piece | Subject | Technique | Interactions | Idle | Mobile | Reduced | Proof |
|---|---|---|---|---|---|---|---|---|
| L1 | **Get the drop home** | The pipe puzzle (kept), plus falling drops you catch and route home through it. A stamp on solve, and a way home always visible | SVG (+ C2D drops) | Rotate pipes; catch drops; keyboard | A drop drips and waits | Bigger tiles | Turn-based | pending |

---

## Budgets every set piece is held to

The brief's numbers. The scripts that check them land in Round E.

| Budget | Limit |
|---|---|
| Frame rate | 60 fps on integrated graphics (desktop); 30 to 60 fps with adaptive degradation (mobile) |
| Draw calls | ≤ 200 per frame |
| Triangles | ≤ 2 million |
| Texture memory | ≤ 256 MB |
| Initial JS per route | ≤ 250 KB gzipped, before WebGL chunks. Each set piece is a lazy chunk mounted as it nears the viewport |
| LCP | < 2.5 s |
| CLS | ≈ 0 |
| Disposal | Strict Mode safe; every scene, listener and ticker is released on unmount |
