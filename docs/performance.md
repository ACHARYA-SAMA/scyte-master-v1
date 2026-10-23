# Performance and accessibility, measured (round 2)

Lighthouse 13.5 against the production build (`next build && next start`) on this machine: Windows 11, an Intel UHD integrated GPU, Chrome headless with ANGLE on Direct3D 11. The desktop runs use `--preset=desktop`; the mobile runs use Lighthouse's default simulated throttling (slow 4G, 4x CPU). On mobile the WebGL stage loads at the first touch or scroll, so mobile scores measure the page without it.

v1's numbers were taken with SwiftShader, software WebGL. These are taken with the real GPU, because that is what visitors have. With SwiftShader the home page scores about 68 on desktop (1.96 s of blocking time); software GL compiles and runs shaders on the CPU.

## Final run (23 October 2026)

| Route | Desktop perf | Mobile perf | A11y | Best practices | SEO | LCP desktop / mobile | TBT desktop / mobile | CLS |
|---|---|---|---|---|---|---|---|---|
| `/` | 82 | 90 | 100 | 100 | 100 | 0.7 s / 3.6 s | 398 / 80 ms | 0.001 |
| `/product` | 98 | 69 | 100 | 100 | 100 | 1.0 s / 5.3 s | 62 / 455 ms | 0.001 |
| `/studio` | 78 | 80 | 100 | 100 | 100 | 1.0 s / 5.0 s | 484 / 129 ms | 0.003 |
| `/work` | 97 | 88 | 100 | 100 | 100 | 0.7 s / 3.8 s | 0 / 80 ms | 0 |
| `/work/this-site` | 99 | 90 | 100 | 100 | 100 | 0.8 s / 3.6 s | 0 / 23 ms | 0.002 |
| `/team` | 100 | 90 | 100 | 100 | 100 | 0.7 s / 3.6 s | 47 / 57 ms | 0.012 |
| `/contact` | 100 | 92 | 100 | 100 | 100 | 0.6 s / 3.2 s | 16 / 110 ms | 0.024 |

Accessibility, best practices and SEO are 100 on every route, desktop and mobile. The 404 page cannot be audited: Lighthouse refuses a page that returns 404, which this one correctly does.

**Run to run.** The two routes whose opening screen is a WebGL scene move the most, because their blocking time is mostly shader compilation, which varies with the driver. In repeated runs of the same build, `/` scored 82 to 87 and `/studio` 78 to 87 on desktop. The table is one full pass, not an average.

## What moved the numbers

Measured with Chrome's long-animation-frame API and CPU profiles of the production build, not guessed.

| Change | Effect |
|---|---|
| Each scene compiles its shaders with `compileAsync` before its first frame, against the target it really draws into (`src/components/gl/warm.ts`) | The home scene's first frame from 998 ms to about 180 ms. Scenes are lazy, so the canvas's own warm-up had been compiling an empty scene. |
| The performance monitor starts 3.5 s after the canvas is ready | It had been reading warm-up frames as a slow device, dropping quality and recompiling the post chain a few seconds after load. |
| Entrances pick their targets in one read, hide them in one write, and play from one IntersectionObserver; headings split only when they arrive | No per-element ScrollTriggers; less layout work at load. |
| Copy wipes in with a clip instead of fading; the audit button slides instead of fading | Accessibility from 87–96 to 100: Lighthouse had been measuring text mid-fade. |
| Real contrast fixes (audit button tag, phone timestamps, muted text in khaki bands, the Send arc's labels); valid list and calendar roles | The remaining accessibility failures |
| Suspense boundaries around page sections (product, studio, contact) | Hydration commits each section in its own task: `/contact` mobile from 83 to 92 |
| `Let's talk.` contains its own reflow (`contain: size layout style`) | Its per-frame weight and width changes no longer re-lay out the page |
| Assembly and Collect draw their full-page textures at 3/4 size | Less canvas drawing and texture upload when those scenes mount |
| Archivo subset to the characters the site uses, self-hosted (58 KB, both axes) | One font file; no third-party font request |

## Tried and not kept

- **Warming the environment-map filter and the post passes ahead of time.** Both still compiled on first use with no measurable change, most likely because Direct3D finishes part of each program at the first draw. The code used PMREMGenerator's private fields, so it was taken out.
- **Suspense boundaries around the footer, menu and command palette.** They made the home and studio openings measurably worse (desktop 72–79 against 82–87 without), so the shell hydrates as before.

## Known gaps

- **Home and studio on desktop (78–87).** What remains is mostly the WebGL scene mounting: the environment map filter (about 350 ms on this GPU) and the post passes compile on first use. A precomputed environment and fewer post passes would be the next levers; both change the look, so they were left for a decision.
- **Product on mobile (69).** It is the longest page: six stations, ten playbooks with working phones, the economics model, the dashboard and the pilot. LCP in the slow-4G simulation is 5.3 s. Splitting the page into separately loaded parts below the fold would be the next step.
- **Mobile LCP is 3.2 to 5.3 s in the simulation.** On an unthrottled load it is under a second; the simulated figure is dominated by script bytes on slow 4G.
- Scores move a few points between runs.
