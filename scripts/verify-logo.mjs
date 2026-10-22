// Proves the traced wordmark matches the original raster.
//
//   npm run logo:verify
//
// Renders /public/brand/scyte-logo.svg with resvg into the original 207x81 frame
// (letterforms offset to source x 34.5, y 23.5), at 1x and 4x, and compares it with
// /public/brand/scyte-logo-original.png. Pixels are compared in "ink coverage" space:
// each colour is projected onto the background -> bone axis, so 0 = background and
// 1 = full letterform.
//
// Writes side-by-side, overlay and diff images to docs/logo-verification/ and exits
// non-zero if the native mismatch exceeds the 0.5 % budget.

import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "docs/logo-verification");
const ORIGINAL = path.join(ROOT, "public/brand/scyte-logo-original.png");
const SVG = path.join(ROOT, "public/brand/scyte-logo.svg");
const GEOMETRY = path.join(ROOT, "src/lib/logo/geometry.ts");

const W = 207;
const H = 81;
const OFFSET_X = 34.5;
const OFFSET_Y = 23.5;
const BG = [28, 38, 31]; // #1C261F
const FG = [194, 184, 151]; // #C2B897
const BUDGET = 0.5; // percent

fs.mkdirSync(OUT, { recursive: true });

const svgSource = fs.readFileSync(SVG, "utf8");
const d = svgSource.match(/ d="([^"]+)"/)?.[1];
if (!d) throw new Error("No path found in scyte-logo.svg");

// The SVG file and the geometry module must describe the same mark.
const { LOGO_PATH } = await import(new URL("file:///" + GEOMETRY.replace(/\\/g, "/")));
if (LOGO_PATH !== d) {
  console.error("scyte-logo.svg is out of sync with src/lib/logo/geometry.ts");
  process.exit(1);
}

const framed = (scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}">` +
  `<rect width="${W}" height="${H}" fill="rgb(${BG})"/>` +
  `<path transform="translate(${OFFSET_X} ${OFFSET_Y})" fill="rgb(${FG})" d="${d}"/></svg>`;

const render = (scale) => {
  const png = new Resvg(framed(scale), { shapeRendering: 2, fitTo: { mode: "zoom", value: 1 } }).render();
  return { width: png.width, height: png.height, data: png.pixels };
};

const axis = FG.map((v, i) => v - BG[i]);
const axisLen2 = axis.reduce((s, v) => s + v * v, 0);
const coverage = (data, i) => {
  let dot = 0;
  for (let c = 0; c < 3; c++) dot += (data[i + c] - BG[c]) * axis[c];
  return Math.min(1, Math.max(0, dot / axisLen2));
};

const toCoverage = ({ width, height, data }) => {
  const out = new Float64Array(width * height);
  for (let p = 0; p < width * height; p++) out[p] = coverage(data, p * 4);
  return { width, height, cov: out };
};

const original = PNG.sync.read(fs.readFileSync(ORIGINAL));
if (original.width !== W || original.height !== H) throw new Error("Unexpected original size");
const orig = toCoverage(original);

const upscaleNearest = (img, k) => {
  const out = new Float64Array(img.width * k * img.height * k);
  for (let y = 0; y < img.height * k; y++)
    for (let x = 0; x < img.width * k; x++) out[y * img.width * k + x] = img.cov[((y / k) | 0) * img.width + ((x / k) | 0)];
  return { width: img.width * k, height: img.height * k, cov: out };
};

const downscaleBox = (img, k) => {
  const w = img.width / k;
  const h = img.height / k;
  const out = new Float64Array(w * h);
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) out[((y / k) | 0) * w + ((x / k) | 0)] += img.cov[y * img.width + x] / (k * k);
  return { width: w, height: h, cov: out };
};

const stats = (a, b, { threshold = 0.1, mask } = {}) => {
  let sum = 0;
  let max = 0;
  let over = 0;
  let counted = 0;
  for (let i = 0; i < a.cov.length; i++) {
    if (mask && !mask(i)) continue;
    const delta = Math.abs(a.cov[i] - b.cov[i]);
    sum += delta;
    max = Math.max(max, delta);
    if (delta > threshold) over++;
    counted++;
  }
  return { meanAbs: sum / counted, max, mismatchPct: (over / counted) * 100, counted, over };
};

// 1. Native size, antialiased render vs original.
const native = toCoverage(render(1));
const nativeStats = stats(native, orig, { threshold: 0.1 });

// 2. 4x render vs 4x nearest-neighbour upscale of the original.
//    The original's edge pixels are 50 % blends (the letter edges sit on half pixels),
//    so in the upscale they become 4x4 blocks of mid-tone that no sharp vector can
//    match. Those blocks are reported separately as "ambiguous"; the mismatch is
//    measured where the original is decisive (coverage < 0.25 or > 0.75).
const four = toCoverage(render(4));
const origFour = upscaleNearest(orig, 4);
const decisive = (i) => origFour.cov[i] < 0.25 || origFour.cov[i] > 0.75;
const fourDecisive = stats(four, origFour, { threshold: 0.5, mask: decisive });
let ambiguous = 0;
for (let i = 0; i < origFour.cov.length; i++) if (!decisive(i)) ambiguous++;

// 3. 4x render box-filtered back to native: the same geometry, antialiased differently.
const fourDown = downscaleBox(four, 4);
const fourDownStats = stats(fourDown, orig, { threshold: 0.1 });

// ---- images -------------------------------------------------------------------------
const writePng = (file, width, height, pixel) => {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      const i = (y * width + x) * 4;
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    }
  fs.writeFileSync(path.join(OUT, file), PNG.sync.write(png));
};
const mix = (c) => BG.map((v, i) => Math.round(v + (FG[i] - v) * c));

// side-by-side at 4x: original (nearest) | traced SVG (4x render) | difference heat
const sw = origFour.width;
const sh = origFour.height;
writePng("side-by-side.png", sw * 3 + 16, sh, (x, y) => {
  if (x < sw) return mix(origFour.cov[y * sw + x]);
  if (x < sw + 8) return [10, 15, 12];
  if (x < sw * 2 + 8) return mix(four.cov[y * sw + (x - sw - 8)]);
  if (x < sw * 2 + 16) return [10, 15, 12];
  const dlt = Math.abs(four.cov[y * sw + (x - sw * 2 - 16)] - origFour.cov[y * sw + (x - sw * 2 - 16)]);
  return [Math.round(255 * dlt), Math.round(61 * dlt), Math.round(46 * dlt)];
});

// overlay at 4x: original in red, traced in green/blue. Agreement reads as grey/white.
writePng("overlay.png", sw, sh, (x, y) => {
  const o = origFour.cov[y * sw + x];
  const t = four.cov[y * sw + x];
  return [Math.round(20 + 235 * o), Math.round(20 + 235 * t), Math.round(20 + 235 * t)];
});

// native diff, magnified 6x so single pixels are visible
const k = 6;
writePng("native-diff-6x.png", W * k, H * k, (x, y) => {
  const i = ((y / k) | 0) * W + ((x / k) | 0);
  const dlt = Math.abs(native.cov[i] - orig.cov[i]);
  const base = mix(orig.cov[i] * 0.35);
  return dlt > 0.1 ? [255, 61, 46] : base;
});

const report = {
  generatedAt: new Date().toISOString(),
  svg: "public/brand/scyte-logo.svg",
  original: "public/brand/scyte-logo-original.png",
  native: { ...round(nativeStats), note: "1x antialiased render vs original; mismatch = |coverage delta| > 0.1" },
  fourX: {
    ...round(fourDecisive),
    ambiguousEdgePixels: ambiguous,
    ambiguousPct: +((ambiguous / origFour.cov.length) * 100).toFixed(3),
    note: "4x render vs 4x nearest-neighbour original; mismatch = binary disagreement where the original is decisive",
  },
  fourXBoxFiltered: { ...round(fourDownStats), note: "4x render box-filtered to 1x vs original" },
  budgetPct: BUDGET,
};
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));

function round(s) {
  return {
    meanAbs: +s.meanAbs.toFixed(5),
    maxAbs: +s.max.toFixed(3),
    mismatchPct: +s.mismatchPct.toFixed(3),
    mismatchedPixels: s.over,
    comparedPixels: s.counted,
  };
}

const worst = Math.max(nativeStats.mismatchPct, fourDecisive.mismatchPct, fourDownStats.mismatchPct);
if (worst > BUDGET) {
  console.error(`FAIL: mismatch ${worst.toFixed(3)} % exceeds ${BUDGET} %`);
  process.exit(1);
}
console.log(`PASS: worst mismatch ${worst.toFixed(3)} % (budget ${BUDGET} %)`);
