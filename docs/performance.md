# Performance and accessibility, measured

Lighthouse 13.5, run against the production build (`next build && next start`) on a local machine, in headless Chromium with SwiftShader. SwiftShader is software WebGL: GPU work runs on the CPU and counts towards blocking time, so these scores are lower than a real device with a GPU would get. The mobile run uses Lighthouse's default simulated throttling (slow 4G, 4x CPU slowdown).

## Final run (22 October 2026)

| Form | Route | Perf | A11y | Best practices | SEO | LCP | TBT | CLS | Bytes |
|---|---|---|---|---|---|---|---|---|---|
| Desktop | `/` | 98 | 100 | 100 | 100 | 0.9 s | 110 ms | 0 | 886 KB |
| Desktop | `/product` | 89 | 100 | 100 | 100 | 1.1 s | 240 ms | 0.001 | 1002 KB |
| Desktop | `/team` | 95 | 100 | 100 | 100 | 0.8 s | 160 ms | 0.001 | 847 KB |
| Desktop | `/services` | 99 | 100 | 100 | 100 | 0.8 s | 100 ms | 0.001 | 848 KB |
| Desktop | `/work` | 96 | 100 | 100 | 100 | 0.8 s | 170 ms | 0.001 | 846 KB |
| Desktop | `/contact` | 94 | 100 | 100 | 100 | 0.9 s | 180 ms | 0.001 | 883 KB |
| Mobile | `/` | 82 | 100 | 100 | 100 | 4.3 s | 160 ms | 0.001 | 639 KB |
| Mobile | `/product` | 77 | 100 | 100 | 100 | 5.2 s | 50 ms | 0.001 | 755 KB |
| Mobile | `/team` | 86 | 100 | 100 | 100 | 4.1 s | 90 ms | 0.002 | 600 KB |
| Mobile | `/services` | 86 | 100 | 100 | 100 | 4.0 s | 100 ms | 0 | 601 KB |
| Mobile | `/work` | 85 | 100 | 100 | 100 | 4.2 s | 110 ms | 0 | 599 KB |
| Mobile | `/contact` | 83 | 100 | 100 | 100 | 4.5 s | 120 ms | 0.001 | 636 KB |

The 404 page cannot be audited: Lighthouse refuses pages that return 404, which this one correctly does.

## What moved the numbers

| Change | Effect |
|---|---|
| The WebGL chunk loads at idle on desktop and at first interaction on touch devices | Mobile TBT on `/` from 2,150 ms to about 160 ms |
| Newsreader without its optical-size axis | About 200 KB less font; mobile LCP on `/` from 5.3 s to 4.2 s |
| Silhouette canvases made CPU-backed and drawn at the size they are sampled | `/team` mobile from 60 to 86, desktop from 85 to 95–100 |
| A free WebGL feature check instead of creating a throwaway context | Removed a 1.4 s main-thread block under software GL |
| Suspense boundaries around page sections | Hydration split into short tasks; `/product` desktop TBT from 460 ms to 180–240 ms |
| `compileAsync` for shaders | Shader warm-up no longer blocks scrolling where the driver supports parallel compile |

## Known gaps

- **Mobile LCP is 4–5 s in the simulation.** The LCP element is real text (the hero statement) that paints at first contentful paint in an unthrottled trace; the simulated figure is dominated by web-font bytes on slow 4G. The next lever would be self-hosted, subset fonts (only the glyphs actually used), which the free Google-hosted builds do not offer.
- **`/product` desktop is the heaviest page** (89): it carries the pipeline, the shopper timeline, the economics model and the dashboard. All of them are interactive by design.
- Scores move a few points between runs; the table is one run, not an average.
