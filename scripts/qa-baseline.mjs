// Baseline capture: every route, stepped one viewport at a time, two frames per step so
// the density audit can tell motion from stillness.
//
//   node scripts/qa-baseline.mjs [baseUrl] [--routes=/|/product] [--widths=390|1440|1920]
//        [--out=docs/qa/baseline] [--max=60] [--settle=1100] [--gap=600]
//
// --settle is how long to wait after each scroll step before the first frame. Set it
// above 3000 to see attract mode: what each screen does once the visitor stops.
//
// Writes <out>/<route>_<width>_<step>.png (first frame), <route>_<width>_<step>.b.png
// (the frame 600 ms later) and <out>/steps.json. Score them with
// `python scripts/qa-density.py <out>`. Recordings are scripts/qa-record.mjs.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const base = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3200";
const routes = flag("routes", "/|/product|/studio|/work|/work/this-site|/team|/contact|/does-not-exist").split("|");
const widths = flag("widths", "390|1440|1920").split("|").map(Number);
const out = path.resolve(flag("out", "docs/qa/baseline"));
const maxSteps = Number(flag("max", "60"));
const settle = Number(flag("settle", "1100"));
const gap = Number(flag("gap", "600"));
fs.mkdirSync(out, { recursive: true });

const findChromium = () => {
  const cache = path.join(os.homedir(), "AppData", "Local", "ms-playwright");
  if (!fs.existsSync(cache)) return undefined;
  const dirs = fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    for (const exe of ["chrome-win64/chrome.exe", "chrome-win/chrome.exe", "chrome-linux/chrome"]) {
      const p = path.join(cache, d, exe);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
};

const launch = async () => {
  const opts = {
    headless: true,
    args: [
      "--use-angle=d3d11",
      "--enable-gpu",
      "--ignore-gpu-blocklist",
      // a headless page is "hidden"; without these its frames are throttled to a crawl
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  };
  try {
    return await chromium.launch(opts);
  } catch {
    return chromium.launch({ ...opts, executablePath: findChromium() });
  }
};

const slug = (route) => (route === "/" ? "home" : route.slice(1).replace(/\W+/g, "-"));
const heightFor = (w) => (w <= 430 ? 844 : w >= 1900 ? 1080 : 900);

const browser = await launch();
// merge with an earlier run, replacing only what this run recaptures
const stepsFile = path.join(out, "steps.json");
const redo = new Set(widths.flatMap((w) => routes.map((r) => `${r}@${w}`)));
const steps = fs.existsSync(stepsFile) ? JSON.parse(fs.readFileSync(stepsFile, "utf8")).filter((s) => !redo.has(`${s.route}@${s.width}`)) : [];
const save = () => fs.writeFileSync(stepsFile, JSON.stringify(steps, null, 2));
for (const width of widths) {
  const height = heightFor(width);
  for (const route of routes) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile: width <= 430,
      hasTouch: width <= 820,
    });
    await ctx.addInitScript(() => {
      try {
        sessionStorage.setItem("scyte.preloaded", "1");
      } catch {}
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3000);
    // a touch or a scroll is what loads the stage on phones
    if (width <= 430) await page.mouse.wheel(0, 1).catch(() => {});
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const count = Math.min(maxSteps, Math.max(1, Math.ceil((total - height) / height) + 1));
    for (let i = 0; i < count; i++) {
      const y = Math.min(total - height, i * height);
      await page.evaluate((top) => {
        const lenis = window.__lenis;
        if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
        else window.scrollTo(0, top);
      }, y);
      await page.waitForTimeout(settle);
      const name = `${slug(route)}_${width}_${String(i).padStart(2, "0")}`;
      await page.screenshot({ path: path.join(out, `${name}.png`) });
      await page.waitForTimeout(gap);
      await page.screenshot({ path: path.join(out, `${name}.b.png`) });
      steps.push({ route, width, height, step: i, y, total, name });
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    steps.push({ route, width, summary: true, total, overflow, errors: [...errors] });
    await ctx.close();
    save();
    console.log(`${route} @ ${width}: ${count} steps, ${errors.length} errors`);
  }
}
await browser.close();
save();
console.log(`shots in ${out}`);
