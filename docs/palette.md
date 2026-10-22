# Palette extraction, round 2

The client asked for the original green and yellow back. Those colours were recovered from the original site's source. The fallback described in the brief was not needed.

## How the colours were found

1. **Git history.** Commit `ebd6bbd` ("Import base site as received") is the original site exactly as it was handed over. Every colour literal in its CSS and components was pulled with `git grep` over `*.css`, `*.ts` and `*.tsx`.
2. **The live site.** https://scyte.vercel.app was loaded in headless Chromium. The `:root` custom properties and the computed colours of every rendered element were counted. The live build matches the repo: the same two variables, the same component colours. A contact sheet of the live site is at `docs/recon/original-site-live.png`.
3. **The logo PNG.** Its two tones, bone `#C2B897` on `#1C261F`, agree with the site's own variables to within one or two RGB steps.

## What the original site declared

`src/app/globals.css` in `ebd6bbd`:

```css
--neon-accent: #C2B897; /* Matches the muted khaki/beige SCYTE signature */
--oak-green: #1B261D;   /* Deep, muted oak green */
```

So the "yellow" the client remembers is this khaki. The original's own CSS calls it the neon accent.

## Recovered tokens

Every value below appears in the original source. OKLCH is measured; contrast is against Ground.

| Token | Hex | Where it came from | OKLCH (L, C, H) | Role in round 2 |
|---|---|---|---|---|
| Ground | `#1B261D` | `globals.css:5` `--oak-green` (also `#1A241C` on most sections, `HeroScrollSequence.tsx:426,478,492`) | 0.255, 0.023, 150 | Page background, the dominant colour |
| Ground deep | `#152018` | `HeroScrollSequence.tsx:590` (service cards) | 0.230, 0.022, 153 | Wells, device screens, the HUD's deepest panels |
| Surface | `#253026` | `AnimatedFooter.tsx:91` (footer) | 0.295, 0.023, 147 | Footer, raised bands |
| Raised | `#2B3A2F` | `HeroScrollSequence.tsx:703` (wipe slab) | 0.331, 0.028, 153 | Controls, bezels, matte 3D surfaces |
| Line | `#334638` | `HeroScrollSequence.tsx:744` (outlined word) | 0.373, 0.034, 153 | Hairlines, the grid, inactive states |
| Khaki | `#C2B897` | `globals.css:4` `--neon-accent`, the logo | 0.782, 0.046, 93 | Logo, accent, the inverted band |
| Khaki light | `#CFC7AA` | `HeroScrollSequence.tsx:484`, `AnimatedFooter.tsx:91` (all body text) | 0.829, 0.040, 94 | Body text |
| Cream | `#E6D5B8` | `HeroScrollSequence.tsx:576` (scroll words) | 0.879, 0.043, 81 | Headlines and key figures |

`#1A241C` and `#1B261D` differ by one RGB step, so they merge into Ground. The original WebGL background mixed between `vec3(0.10, 0.15, 0.12)` and `vec3(0.15, 0.20, 0.17)`, about `#1A261F` to `#26332B`. Both sit inside the Ground to Surface range.

## Derived tokens (flagged)

The original had nothing for three jobs the brief requires. Each derived colour sits on a hue the original already uses.

| Token | Hex | How it was made | Why it is needed |
|---|---|---|---|
| Abyss | `#09120B` | Ground's hue (151°), lightness lowered to 0.17 | The original used neutral `#050505` for its preloader and one section. The brief bans neutral black, and 3D fog and depth need a colour darker than Ground. |
| Muted | `#929884` | Midway between the green and khaki hues, at L 0.67 | Secondary text needs AA contrast. The original used white at 50 % opacity, which is gone with white. 5.3:1 on Ground, 4.6:1 on Surface. |
| Lumen | `#F9DC7D` | Khaki's exact hue (93°), raised to L 0.90 and C 0.12 | The brief makes yellow the light source: the liquid in the pipes and the glow of a recovered order. At its own chroma, khaki reads as paint rather than light. Lumen is the same hue, lit. |

**Route taken:** recovered from the original source, plus three derived tones. The original had no brighter yellow, so Lumen is an addition and needs the client's approval. If they say no, emitted light falls back to Cream with bloom, which is dimmer but stays inside the original palette.

## Removed

| Colour | From | Why |
|---|---|---|
| `#FFFFFF` | original body text, buttons | The brief bans pure white text |
| `#050505`, `#111`, `#222`, `#333` | original preloader, laptop mock-up | Neutral greys and black are replaced with green-black |
| `#0A0A2A` | original laptop webcam | Off-palette blue |
| `#FF3D2E`, `#B8291C` | v1 signal red | The brief bans red and orange accents |
| `#EDE8D8` | v1 paper | Replaced by the khaki inverted band |
| `#0A0F0C`, `#1C261F`, `#2A3A2F`, `#3A4D40`, `#9A9379`, `#858F7C` | v1 tokens | Replaced by the recovered values above |
| `#B08F3A`, `#2A835B` | v1 chart series | Charts are re-derived from the new tokens before the dashboard is built |

## Contrast (WCAG 2.2)

| Text on | Ground | Surface | Raised | Ground deep | Abyss |
|---|---|---|---|---|---|
| Cream | 10.9 | 9.5 | 8.3 | 11.6 | 13.2 |
| Khaki light | 9.2 | 8.1 | 7.1 | 9.9 | 11.3 |
| Khaki | 7.9 | 6.9 | 6.1 | 8.5 | 9.6 |
| Muted | 5.3 | 4.6 | 4.0 (large text only) | 5.6 | 6.4 |
| Lumen | 11.6 | 10.2 | 8.9 | 12.4 | 14.1 |

Inverted band: Ground on Khaki is 7.9:1, Ground deep on Khaki 8.5:1, Surface on Khaki 6.9:1.

## Proportions

These are rules for every page, not averages.

- **Green, about 85 % of any screen.** Ground, Ground deep, Surface, Raised, Abyss, and the green glass in 3D.
- **Khaki, Khaki light and Cream, about 13 %.** Text, the logo, hairlines once lit, and one or two inverted khaki bands per long page.
- **Lumen, under 2 %.** Only light that comes from something: the liquid, a droplet, a recovered order, the live dot on a selected HUD target. Lumen is never a fill or a background, and never set as body text.

Status without red: failure is shown by light going out (a droplet dims to Line and falls), by form (struck, hollow, dashed) and by a written label. It is never shown by hue alone.

The board that shows all of this at size is `docs/recon/palette-and-type.png`.
