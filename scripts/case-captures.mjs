// Frames for Case 00: each page's opening screen, or each scene, from a running build.
//
//   node scripts/case-captures.mjs <baseUrl> <outDir> [--set=pages|scenes] [--wait=9000]
//
// Pages: the opening screen of every route at 1440 x 900, for the timelapse. Earlier
// rounds are shot by checking a commit out into a worktree and pointing this at it.
// Scenes: each Case 00 scene at 1280 x 800, framed where the scene is, for the
// draft-against-final sliders. PNGs land in outDir; scripts/case-webp.py encodes them.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const [base = "http://localhost:3100", outDir = "docs/proof/case"] = args.filter((a) => !a.startsWith("--"));
const set = flag("set", "pages");
const wait = Number(flag("wait", "9000"));
fs.mkdirSync(outDir, { recursive: true });

const PAGES = [
  { id: "home", path: "/" },
  { id: "product", path: "/product" },
  { id: "studio", path: "/studio" },
  { id: "work", path: "/work" },
  { id: "team", path: "/team" },
  { id: "contact", path: "/contact" },
];

/** Where each scene is: a route, then an element to bring to the top (or a pixel offset). */
const SCENES = [
  { id: "leak", path: "/", y: "0" },
  { id: "reasons", path: "/", y: "[data-chapter='2'], #reasons, section:nth-of-type(2)" },
  { id: "gate", path: "/product", y: "#identify" },
  { id: "rules", path: "/product", y: "#decide" },
  { id: "send", path: "/product", y: "#send" },
  { id: "assembly", path: "/studio", y: "#assembly" },
  { id: "scan", path: "/team", y: "0" },
  { id: "chat", path: "/contact", y: "0" },
];

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
const opts = { headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] };
const browser = await chromium.launch(opts).catch(() => chromium.launch({ ...opts, executablePath: findChromium() }));

const list = set === "scenes" ? SCENES : PAGES.map((p) => ({ ...p, y: "0" }));
const size = set === "scenes" ? { width: 1280, height: 800 } : { width: 1440, height: 900 };
for (const item of list) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  // no once-per-session preloader in the frame
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("scyte.preloaded", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(base + item.path, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(wait);
  if (item.y !== "0") {
    await page.evaluate((sel) => {
      const el = sel.split(",").map((s) => document.querySelector(s.trim())).find(Boolean);
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 2);
    }, item.y);
    await page.waitForTimeout(2500);
  }
  const file = path.join(outDir, `${item.id}.png`);
  await page.screenshot({ path: file });
  console.log(file);
  await ctx.close();
}
await browser.close();
