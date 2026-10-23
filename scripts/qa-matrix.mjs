// Render regression harness. Every route across a matrix of viewports, browser zoom,
// browsers, CPU throttling and a software-WebGL pass, with automated checks:
//
//   horizontal overflow        the page scrolls sideways
//   fixed UI over data-avoid   the nav, the audit pill, the rail or the frame strip
//                              covers an element tagged data-avoid
//   clipped text               a text box cut by its own overflow
//   empty blocks               an element over 200 x 200 px with nothing in it, drawn
//                              as a near-flat colour (the client's orphan panel)
//   console errors             any error fails the run
//   layout shift               the CLS the page accumulates while it is stepped
//
// and screenshots at 0, 25, 50, 75 and 100 % of every pinned section.
//
//   node scripts/qa-matrix.mjs [baseUrl] [--routes=/|/product] [--quick] [--full]
//        [--out=docs/qa/matrix] [--browsers=chromium|msedge] [--shots=0]
//
// --quick: 1366 x 768 and 390 x 844 at 100 %. Default: the client's laptops plus the
// common desktop and phone sizes, zoom 100 and 125. --full: the whole brief matrix.
// Writes <out>/report.json and <out>/report.md; exits 1 when any check fails.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const has = (name) => args.includes(`--${name}`);
const base = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3200";
const routes = flag("routes", "/|/product|/studio|/work|/work/this-site|/team|/contact|/does-not-exist").split("|");
const out = path.resolve(flag("out", "docs/qa/matrix"));
const shots = flag("shots", "1") !== "0";
const browsers = flag("browsers", "chromium").split("|");
fs.mkdirSync(out, { recursive: true });

const DESKTOP = [
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1536, 864],
  [1680, 1050],
  [1920, 1080],
  [2560, 1440],
  [3440, 1440],
];
const SMALL = [
  [360, 640],
  [390, 844],
  [412, 915],
  [820, 1180],
];
const matrix = has("quick")
  ? [
      { w: 1366, h: 768, zoom: 1 },
      { w: 390, h: 844, zoom: 1 },
    ]
  : has("full")
    ? [...DESKTOP, ...SMALL].flatMap(([w, h]) => (w > 820 ? [1, 1.1, 1.25, 1.5] : [1]).map((zoom) => ({ w, h, zoom })))
    : [
        { w: 1280, h: 720, zoom: 1 },
        { w: 1366, h: 768, zoom: 1 },
        { w: 1366, h: 768, zoom: 1.25 },
        { w: 1536, h: 864, zoom: 1 },
        { w: 1536, h: 864, zoom: 1.25 },
        { w: 1920, h: 1080, zoom: 1 },
        { w: 1920, h: 1080, zoom: 1.5 },
        { w: 390, h: 844, zoom: 1 },
        { w: 820, h: 1180, zoom: 1 },
      ];
// extra passes: weak CPUs, and WebGL without a GPU
const passes = has("full")
  ? [
      { name: "gpu", cpu: 1, gl: "d3d11" },
      { name: "cpu4x", cpu: 4, gl: "d3d11" },
      { name: "cpu6x", cpu: 6, gl: "d3d11" },
      { name: "swiftshader", cpu: 1, gl: "swiftshader" },
    ]
  : [{ name: "gpu", cpu: 1, gl: "d3d11" }];

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

const launch = async (browser, glMode) => {
  const opts = {
    headless: true,
    args: [
      glMode === "swiftshader" ? "--use-angle=swiftshader" : "--use-angle=d3d11",
      ...(glMode === "swiftshader" ? ["--enable-unsafe-swiftshader"] : ["--enable-gpu", "--ignore-gpu-blocklist"]),
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  };
  // the Edge channel uses the Edge already installed on this machine; nothing is downloaded
  if (browser === "msedge") return chromium.launch({ ...opts, channel: "msedge" });
  // Firefox and WebKit need the builds this Playwright version expects: `npx playwright
  // install firefox webkit` (a download, so it is never done by this script)
  if (browser === "firefox") return firefox.launch({ headless: true });
  if (browser === "webkit") return webkit.launch({ headless: true });
  try {
    return await chromium.launch(opts);
  } catch {
    return chromium.launch({ ...opts, executablePath: findChromium() });
  }
};

const slug = (route) => (route === "/" ? "home" : route.slice(1).replace(/\W+/g, "-"));

/** The checks, run inside the page. Returns a list of findings. */
const audit = () => {
  const found = [];
  const W = window.innerWidth;
  const H = window.innerHeight;
  const doc = document.scrollingElement || document.documentElement;
  if (doc.scrollWidth > W + 1) found.push({ check: "overflow-x", detail: `page is ${doc.scrollWidth}px wide in a ${W}px viewport` });

  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
  };
  const name = (el) => {
    const cls = typeof el.className === "string" ? el.className.split(" ")[0] : "";
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls ? `.${cls.replace(/_[A-Za-z0-9-]+$/, "")}` : ""}`;
  };
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

  // fixed UI that must never cover what is tagged data-avoid
  const fixed = [...document.querySelectorAll("[data-audit-pill], [data-qa-fixed]")].filter((el) => getComputedStyle(el).position === "fixed" && visible(el));
  const avoid = [...document.querySelectorAll("[data-avoid]")].filter(visible);
  for (const f of fixed) {
    const fr = f.getBoundingClientRect();
    for (const a of avoid) {
      if (f.contains(a) || a.contains(f)) continue;
      const ar = a.getBoundingClientRect();
      const o = inter(fr, ar);
      if (o > 40) found.push({ check: "fixed-over-avoid", detail: `${name(f)} covers ${name(a)} by ${Math.round(o)} px²` });
    }
  }

  // text cut by its own box
  for (const el of document.querySelectorAll("h1, h2, h3, p, li, dd, dt, button, a, label, td, th")) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (!/(hidden|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY)) continue;
    if (cs.textOverflow === "ellipsis") continue;
    if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 4) {
      if (el.closest(".sr-only, [aria-hidden='true'], [data-qa-clip-ok]")) continue;
      found.push({ check: "clipped-text", detail: `${name(el)}: "${(el.textContent || "").trim().slice(0, 40)}"` });
    }
  }

  // large blocks with nothing in them: candidates; the runner confirms with pixels
  const empties = [];
  for (const el of document.querySelectorAll("main div, main section, main aside, main article, main figure")) {
    const r = el.getBoundingClientRect();
    if (r.width < 200 || r.height < 200 || r.bottom < 0 || r.top > H) continue;
    if (!visible(el)) continue;
    const content = el.querySelector("img, svg, canvas, video, iframe, input, textarea, button, a, [data-qa-art]");
    const text = (el.innerText || "").trim();
    if (content || text.length > 0) continue;
    const bg = getComputedStyle(el).backgroundColor;
    if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") continue;
    const cw = Math.min(W, r.right) - Math.max(0, r.left);
    const ch = Math.min(H, r.bottom) - Math.max(0, r.top);
    if (cw < 200 || ch < 200) continue;
    empties.push({ x: Math.max(0, r.left), y: Math.max(0, r.top), w: cw, h: ch, name: name(el) });
  }
  return { found, empties, pins: [...document.querySelectorAll("*")].filter((el) => getComputedStyle(el).position === "sticky").map((el) => el.parentElement?.id || name(el.parentElement || el)) };
};

const report = [];
let failures = 0;

for (const browserName of browsers) {
  for (const pass of passes) {
    let browser;
    try {
      browser = await launch(browserName, pass.gl);
    } catch (e) {
      report.push({ browser: browserName, pass: pass.name, skipped: String(e).split("\n")[0] });
      continue;
    }
    for (const { w, h, zoom } of matrix) {
      // browser zoom: the layout viewport shrinks by the zoom and the pixels grow by it
      const vw = Math.round(w / zoom);
      const vh = Math.round(h / zoom);
      for (const route of routes) {
        const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: zoom, isMobile: browserName !== "firefox" && w <= 430, hasTouch: w <= 820 });
        await ctx.addInitScript(() => {
          try {
            sessionStorage.setItem("scyte.preloaded", "1");
          } catch {}
          window.__cls = 0;
          new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__cls += e.value))).observe({ type: "layout-shift", buffered: true });
        });
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
        // the 404 route's own document answers 404 on purpose
        page.on("console", (m) => m.type() === "error" && !(route === "/does-not-exist" && /status of 404/.test(m.text())) && errors.push(m.text().slice(0, 600)));
        if (pass.cpu > 1 && browserName !== "firefox" && browserName !== "webkit") {
          const cdp = await ctx.newCDPSession(page);
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: pass.cpu });
        }
        const tag = `${browserName}_${pass.name}_${w}x${h}@${Math.round(zoom * 100)}_${slug(route)}`;
        const entry = { browser: browserName, pass: pass.name, w, h, zoom, route, findings: [], errors: [], cls: 0 };
        try {
          await page.goto(base + route, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
          await page.waitForTimeout(3500);
          const total = await page.evaluate(() => (document.scrollingElement || document.documentElement).scrollHeight);
          const step = vh * 0.9;
          const seen = new Set();
          for (let y = 0; y < total; y += step) {
            await page.evaluate((top) => window.scrollTo(0, top), y);
            await page.waitForTimeout(450);
            const r = await page.evaluate(audit);
            for (const f of r.found) {
              const key = `${f.check}|${f.detail}`;
              if (seen.has(key)) continue;
              seen.add(key);
              entry.findings.push({ ...f, y: Math.round(y) });
            }
            // confirm empty-block candidates by their pixels: near-flat means empty
            for (const e of r.empties) {
              const key = `empty|${e.name}`;
              if (seen.has(key)) continue;
              const buf = await page.screenshot({ clip: { x: e.x, y: e.y, width: Math.max(1, e.w), height: Math.max(1, e.h) }, type: "png" }).catch(() => null);
              if (!buf) continue;
              const flat = await page.evaluate(async (b64) => {
                const img = new Image();
                img.src = `data:image/png;base64,${b64}`;
                await img.decode();
                const c = document.createElement("canvas");
                c.width = 64;
                c.height = 64;
                const x = c.getContext("2d");
                x.drawImage(img, 0, 0, 64, 64);
                const d = x.getImageData(0, 0, 64, 64).data;
                let m = 0;
                let m2 = 0;
                for (let i = 0; i < d.length; i += 4) {
                  const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
                  m += l;
                  m2 += l * l;
                }
                const n = d.length / 4;
                return Math.sqrt(m2 / n - (m / n) ** 2);
              }, buf.toString("base64"));
              if (flat < 2.5) {
                seen.add(key);
                entry.findings.push({ check: "empty-block", detail: `${e.name} ${Math.round(e.w)}x${Math.round(e.h)} (σ ${flat.toFixed(1)})`, y: Math.round(y) });
              }
            }
          }
          // pinned sections at five points each
          if (shots && pass.name === "gpu" && zoom === 1) {
            const pins = await page.evaluate(() =>
              [...document.querySelectorAll("section, div")]
                .filter((el) => el.firstElementChild && getComputedStyle(el.firstElementChild).position === "sticky" && el.offsetHeight > window.innerHeight * 1.5)
                .map((el) => ({ top: el.getBoundingClientRect().top + window.scrollY, h: el.offsetHeight, id: el.id || el.getAttribute("aria-label") || el.className.split(" ")[0] })),
            );
            for (const [i, pin] of pins.entries()) {
              for (const pct of [0, 25, 50, 75, 100]) {
                const y = pin.top + ((pin.h - vh) * pct) / 100;
                await page.evaluate((top) => window.scrollTo(0, top), y);
                await page.waitForTimeout(700);
                await page.screenshot({ path: path.join(out, `${tag}_pin${i}-${String(pin.id).replace(/\W+/g, "-").slice(0, 24)}_${pct}.png`) });
              }
            }
          }
          entry.cls = await page.evaluate(() => window.__cls || 0);
        } catch (e) {
          entry.findings.push({ check: "run", detail: String(e).slice(0, 200) });
        }
        entry.errors = [...new Set(errors)];
        const bad = entry.findings.length + entry.errors.length + (entry.cls > 0.1 ? 1 : 0);
        failures += bad;
        report.push(entry);
        console.log(`${bad ? "FAIL" : "ok  "} ${tag}${bad ? `  ${entry.findings.length} findings, ${entry.errors.length} errors, CLS ${entry.cls.toFixed(3)}` : ""}`);
        fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
        await ctx.close();
      }
    }
    await browser.close();
  }
}

const md = [
  "# Render matrix",
  "",
  `Base ${base}, ${new Date().toISOString().slice(0, 16)} UTC. ${failures ? `${failures} problems.` : "No problems."}`,
  "",
  "| Browser | Pass | Viewport | Zoom | Route | Findings | Errors | CLS |",
  "|---|---|---|---|---|---|---|---|",
  ...report
    .filter((r) => !r.skipped)
    .map((r) => `| ${r.browser} | ${r.pass} | ${r.w}x${r.h} | ${Math.round(r.zoom * 100)} % | ${r.route} | ${r.findings.map((f) => `${f.check}: ${f.detail}`).join("<br>") || "none"} | ${r.errors.join("<br>") || "none"} | ${r.cls.toFixed(3)} |`),
  ...report.filter((r) => r.skipped).map((r) => `\nSkipped ${r.browser} ${r.pass}: ${r.skipped}`),
];
fs.writeFileSync(path.join(out, "report.md"), md.join("\n"));
process.exit(failures ? 1 : 0);
