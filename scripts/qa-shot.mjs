// One-off screenshots for checking a piece of work while building it.
//
//   node scripts/qa-shot.mjs <url> <out.png> [--w=1440] [--h=900] [--y=0|selector] [--wait=2500]
//        [--full] [--act=hover:<sel>|click:<sel>|drag:<sel>:dx:dy|wheel:dy|key:<key>|wait:ms,...]
//
// --y scrolls to a pixel offset, or to an element when given a CSS selector.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const [url, out] = args.filter((a) => !a.startsWith("--"));
const width = Number(flag("w", "1440"));
const height = Number(flag("h", "900"));
const y = flag("y", "0");
const wait = Number(flag("wait", "2500"));
const acts = flag("act", "").split(",").filter(Boolean);

const findChromium = () => {
  const cache = path.join(os.homedir(), "AppData", "Local", "ms-playwright");
  if (!fs.existsSync(cache)) return undefined;
  const dirs = fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    const p = path.join(cache, d, "chrome-win64", "chrome.exe");
    if (fs.existsSync(p)) return p;
  }
  return undefined;
};
const opts = {
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
};
const browser = await chromium.launch(opts).catch(() => chromium.launch({ ...opts, executablePath: findChromium() }));
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width <= 430, hasTouch: width <= 820 });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("scyte.preloaded", "1");
  } catch {}
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
await page.waitForTimeout(wait);
if (y !== "0") {
  // an absolute jump: smooth scrolling would swallow scrollIntoView
  await page.evaluate((target) => {
    const n = Number(target);
    const el = Number.isFinite(n) ? null : document.querySelector(target);
    const top = el ? el.getBoundingClientRect().top + window.scrollY + 2 : n;
    window.scrollTo(0, top);
  }, y);
  await page.waitForTimeout(1200);
}
for (const act of acts) {
  const [kind, sel, a, b] = act.split(":");
  if (kind === "wait") await page.waitForTimeout(Number(sel));
  else if (kind === "wheel") await page.mouse.wheel(0, Number(sel));
  else if (kind === "key") await page.keyboard.press(sel);
  else if (kind === "move") await page.mouse.move(Number(sel), Number(a), { steps: 12 });
  else {
    const box = await page.locator(sel).first().boundingBox();
    if (!box) continue;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    if (kind === "hover") await page.mouse.move(cx, cy, { steps: 10 });
    if (kind === "click") await page.mouse.click(cx, cy);
    if (kind === "drag") {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + Number(a), cy + Number(b), { steps: 20 });
      await page.mouse.up();
    }
  }
  await page.waitForTimeout(500);
}
await page.screenshot({ path: out, fullPage: args.includes("--full") });
if (errors.length) console.log("errors:", errors.slice(0, 6).join("\n"));
await browser.close();
