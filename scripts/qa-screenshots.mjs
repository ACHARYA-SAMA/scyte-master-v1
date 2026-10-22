// QA screenshots across widths and routes.
//
//   npm run qa:shots -- [baseUrl] [--routes=/,/product] [--widths=390,1440] [--scroll=0,0.5,1] [--out=dir]
//
// Uses Playwright's Chromium. If the bundled browser for this Playwright version is not
// downloaded, falls back to any Chromium already in the Playwright cache.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
};
const base = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3100";
const routes = flag("routes", "/,/product,/team,/services,/work,/contact,/does-not-exist").split(",");
const widths = flag("widths", "390,768,1280,1440,1920").split(",").map(Number);
const scrolls = flag("scroll", "0").split(",").map(Number);
const out = path.resolve(flag("out", "docs/qa"));
const wait = Number(flag("wait", "2600"));
fs.mkdirSync(out, { recursive: true });

const findChromium = () => {
  const cache = path.join(os.homedir(), "AppData", "Local", "ms-playwright");
  if (!fs.existsSync(cache)) return undefined;
  const dirs = fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    for (const exe of ["chrome-win64/chrome.exe", "chrome-win/chrome.exe", "chrome-linux/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]) {
      const p = path.join(cache, d, exe);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
};

const launch = async () => {
  const opts = { headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] };
  try {
    return await chromium.launch(opts);
  } catch {
    return chromium.launch({ ...opts, executablePath: findChromium() });
  }
};

const browser = await launch();
const report = [];
for (const width of widths) {
  const height = width <= 430 ? 844 : width <= 820 ? 1024 : width >= 1900 ? 1080 : 900;
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: width <= 430,
    hasTouch: width <= 820,
  });
  // Skip the once-per-session preloader for layout shots.
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("scyte.preloaded", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  for (const route of routes) {
    await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(wait);
    for (const s of scrolls) {
      await page.evaluate((p) => {
        const max = document.documentElement.scrollHeight - innerHeight;
        window.scrollTo(0, max * p);
      }, s);
      await page.waitForTimeout(s ? 1400 : 200);
      const name = `${route === "/" ? "home" : route.slice(1).replace(/\W+/g, "-")}_${width}${scrolls.length > 1 ? `_s${s}` : ""}.png`;
      await page.screenshot({ path: path.join(out, name) });
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    report.push({ route, width, horizontalOverflowPx: overflow, errors: [...errors] });
    errors.length = 0;
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.filter((r) => r.errors.length || r.horizontalOverflowPx > 0), null, 2));
console.log(`shots in ${out}`);
