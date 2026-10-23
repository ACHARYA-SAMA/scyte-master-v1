// The Junction, end to end, with real input: arrive, steer, charge with the wheel,
// dive, splash, land. Captures every phase and measures the frame rate of the dive
// and the input-to-visual latency of a steer, so the brief's budgets can be checked.
//
//   node scripts/qa-junction.mjs [baseUrl] [--from=/product] [--w=1440] [--h=900]
//        [--out=docs/proof/junction] [--key]   (--key: steer and go with the keyboard)
//
// Needs the development build (it reads window.__scyte).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flag = (n, f) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? f;
const base = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3100";
const from = flag("from", "/product");
const W = Number(flag("w", "1440"));
const H = Number(flag("h", "900"));
const out = path.resolve(flag("out", "docs/proof/junction"));
const keyboard = args.includes("--key");
fs.mkdirSync(out, { recursive: true });

const exe = (() => {
  const cache = path.join(os.homedir(), "AppData", "Local", "ms-playwright");
  const dir = fs.existsSync(cache) ? fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()[0] : null;
  return dir ? path.join(cache, dir, "chrome-win64", "chrome.exe") : undefined;
})();
const opts = { headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] };
const browser = await chromium.launch(opts).catch(() => chromium.launch({ ...opts, executablePath: exe }));
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("scyte.preloaded", "1");
  } catch {}
  // frame times and long tasks, for the dive
  window.__frames = [];
  const loop = (t) => {
    window.__frames.push(t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.__long = [];
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push({ at: e.startTime, ms: e.duration }))).observe({ type: "longtask", buffered: true });
  } catch {}
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 300)));
const state = () => page.evaluate(() => window.__scyte?.junction?.get());
const shot = (name) => page.screenshot({ path: path.join(out, `${name}.png`) });

await page.goto(base + from, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
await page.waitForTimeout(4000);
await page.evaluate(() => {
  const j = document.getElementById("junction");
  window.scrollTo(0, j.getBoundingClientRect().top + window.scrollY + 2);
});
// wait for the chamber to draw
const t0 = Date.now();
while (Date.now() - t0 < 30000) {
  const s = await state();
  if (s?.drawn && s.phase !== "away") break;
  await page.waitForTimeout(250);
}
console.log("arrived", JSON.stringify(await state()), `${Date.now() - t0} ms to draw`);
await page.waitForTimeout(1200);
await shot("1-arrived");

// steer: input to visual, measured from the event to the frame the sign changed
await page.mouse.move(W / 2, H / 2);
const steer = await page.evaluate(async () => {
  const signs = [...document.querySelectorAll("#junction a[data-cursor]")];
  const target = signs[signs.length - 1];
  const r = target.getBoundingClientRect();
  const t = performance.now();
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: "mouse" }));
  return await new Promise((resolve) => {
    const check = () => (target.dataset.on === "1" ? resolve(performance.now() - t) : requestAnimationFrame(check));
    check();
    setTimeout(() => resolve(-1), 2000);
  });
});
console.log("steer latency", steer.toFixed(1), "ms");
await page.waitForTimeout(500);
await shot("2-steered");

// back to Continue, then charge
if (keyboard) {
  await page.keyboard.press("Digit3");
} else await page.mouse.move(W / 2, H * 0.45);
await page.waitForTimeout(400);
const target = (await state()).hi;
console.log("target slot", target);
let s = await state();
let n = 0;
let half = false;
let frames0 = 0;
while (s.phase !== "travel" && n < 80) {
  if (keyboard) await page.keyboard.press("PageDown");
  else await page.mouse.wheel(0, 110);
  await page.waitForTimeout(keyboard ? 260 : 70);
  s = await state();
  if (!half && s.charge > 0.45) {
    half = true;
    await shot("3-charging");
  }
  n++;
}
console.log("charge steps", n, JSON.stringify(s));
frames0 = await page.evaluate(() => window.__frames.length);
const diveAt = await page.evaluate(() => performance.now());
await page.waitForTimeout(380);
await shot("4-dive");
await page.waitForTimeout(500);
await shot("5-splash");
// land
const t1 = Date.now();
while (Date.now() - t1 < 8000) {
  const gone = await page.evaluate(() => !document.querySelector("[aria-label^='Arriving at']"));
  if (gone) break;
  await page.waitForTimeout(100);
}
const landed = Date.now() - t1;
await page.waitForTimeout(400);
await shot("6-landed");
const perf = await page.evaluate(
  ({ diveAt, frames0 }) => {
    const f = window.__frames.slice(frames0);
    const dive = f.filter((t) => t >= diveAt && t <= diveAt + 700);
    const gaps = dive.slice(1).map((t, i) => t - dive[i]);
    const fps = gaps.length ? 1000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;
    const worst = gaps.length ? Math.max(...gaps) : 0;
    const long = window.__long.filter((l) => l.at >= diveAt && l.at <= diveAt + 700);
    return { fps: Math.round(fps), worstFrameMs: Math.round(worst), longTasks: long.map((l) => Math.round(l.ms)), path: location.pathname };
  },
  { diveAt, frames0 },
);
console.log("dive", JSON.stringify(perf), "splash to page", landed, "ms");
console.log("errors", errors.length ? errors : "none");
fs.writeFileSync(path.join(out, "run.json"), JSON.stringify({ from, viewport: [W, H], keyboard, steerLatencyMs: Math.round(steer), charge: { steps: n }, dive: perf, splashToPageMs: landed, errors }, null, 2));
await browser.close();
