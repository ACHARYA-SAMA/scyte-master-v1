// Interaction recordings: a scripted visit to each route that scrolls through it and, on
// every screen, uses what is there (holds what says Hold, drags what says Drag or Scrub,
// presses a couple of buttons). Frames come from Chrome's screencast; then
//
//   node scripts/qa-record.mjs [baseUrl] [--routes=/|/team] [--width=1440] [--out=docs/qa/baseline/video]
//   python scripts/qa-frames-to-video.py docs/qa/baseline/video
//
// turns each frame folder into a WebM at a steady 25 fps.

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
const width = Number(flag("width", "1440"));
const height = width <= 430 ? 844 : width >= 1900 ? 1080 : 900;
const out = path.resolve(flag("out", "docs/qa/baseline/video"));
const slug = (route) => (route === "/" ? "home" : route.slice(1).replace(/\W+/g, "-"));

// the bundled browser for this Playwright version may not be downloaded; any cached Chromium will do
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
const opts = {
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
};
const browser = await chromium.launch(opts).catch(() => chromium.launch({ ...opts, executablePath: findChromium() }));

for (const route of routes) {
  const dir = path.join(out, `${slug(route)}_${width}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width <= 430, hasTouch: width <= 820 });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("scyte.preloaded", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async ({ data, sessionId, metadata }) => {
    const file = path.join(dir, `${String(frames.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file: path.basename(file), t: metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 72, maxWidth: width, maxHeight: height, everyNthFrame: 1 });
  await page.waitForTimeout(2500);

  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const done = new Set();
  for (let y = 0; y < total; y += height * 0.5) {
    for (let k = 0; k < 6; k++) {
      await page.mouse.wheel(0, height / 12);
      await page.waitForTimeout(70);
    }
    await page.waitForTimeout(700);
    // what can be used on this screen, in reading order
    const targets = await page.evaluate(() =>
      [...document.querySelectorAll("#main [data-cursor]")]
        .map((el, i) => {
          const r = el.getBoundingClientRect();
          const kind = el.getAttribute("data-cursor");
          const ok = r.width > 8 && r.height > 8 && r.top > 60 && r.bottom < innerHeight - 20 && r.left >= 0 && r.right <= innerWidth;
          const button = el.tagName === "BUTTON" || el.getAttribute("role") === "button" || el.tagName === "INPUT";
          return ok ? { i, kind, button, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, key: `${el.tagName}:${el.textContent?.slice(0, 24)}:${Math.round(r.width)}` } : null;
        })
        .filter(Boolean),
    );
    let taps = 0;
    for (const t of targets) {
      if (done.has(t.key)) continue;
      done.add(t.key);
      await page.mouse.move(t.x, t.y, { steps: 12 });
      if (t.kind === "hold") {
        await page.mouse.down();
        await page.waitForTimeout(1400);
        await page.mouse.up();
      } else if (t.kind === "drag" || t.kind === "scrub") {
        await page.mouse.down();
        await page.mouse.move(t.x + Math.min(240, t.w * 0.4), t.y, { steps: 24 });
        await page.mouse.move(t.x - Math.min(120, t.w * 0.2), t.y, { steps: 18 });
        await page.mouse.up();
      } else if (t.kind === "tap" && t.button && taps < 2) {
        taps++;
        await page.mouse.click(t.x, t.y);
      }
      await page.waitForTimeout(450);
    }
  }
  await page.waitForTimeout(1200);
  await cdp.send("Page.stopScreencast").catch(() => {});
  fs.writeFileSync(path.join(dir, "frames.json"), JSON.stringify(frames));
  await ctx.close();
  console.log(`${route}: ${frames.length} frames`);
}
await browser.close();
