"use client";

import { siteFont } from "../../materials";

/**
 * One demo website, drawn as the six layers a build adds in order. All palette
 * colours; the store is the same fictional demo store as on the product page.
 */
export const LW = 1600;
export const LH = 1000;

export const LAYERS = [
  { id: "wireframe", name: "Wireframe", note: "Structure before style: the grid, the blocks, the order" },
  { id: "type", name: "Type", note: "One family, set to a scale" },
  { id: "colour", name: "Colour", note: "The palette, applied by role" },
  { id: "motion", name: "Motion", note: "What moves, how far, how fast" },
  { id: "code", name: "Code", note: "Components, typed and tested" },
  { id: "deploy", name: "Deploy", note: "Built, previewed, live" },
] as const;

export type LayerId = (typeof LAYERS)[number]["id"];

const font = (ctx: CanvasRenderingContext2D, w: number, size: number, stretch = 100) => {
  ctx.font = `${w} ${size}px ${siteFont()}`;
  try {
    (ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = stretch <= 70 ? "extra-condensed" : stretch <= 80 ? "condensed" : "normal";
  } catch {
    /* older browsers draw at normal width */
  }
};

/** The blocks every layer agrees on, in canvas pixels. */
const B = {
  nav: [60, 40, 1480, 60],
  hero: [60, 140, 860, 520],
  title: [980, 180, 560, 220],
  cta: [980, 460, 320, 76],
  cards: [0, 1, 2].map((i) => [60 + i * 500, 700, 460, 250]),
} as const;

const label = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = "#929884") => {
  font(ctx, 600, 22, 72);
  ctx.fillStyle = color;
  ctx.fillText(text.toUpperCase(), x, y);
};

const wireframe = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "#152018";
  ctx.fillRect(0, 0, LW, LH);
  ctx.strokeStyle = "rgba(51,70,56,0.9)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 12; i++) {
    const x = 60 + (i * 1480) / 12;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, LH);
    ctx.stroke();
  }
  ctx.strokeStyle = "#c2b897";
  ctx.lineWidth = 2;
  const box = (r: readonly number[], name: string) => {
    ctx.strokeRect(r[0], r[1], r[2], r[3]);
    ctx.beginPath();
    ctx.moveTo(r[0], r[1]);
    ctx.lineTo(r[0] + r[2], r[1] + r[3]);
    ctx.moveTo(r[0] + r[2], r[1]);
    ctx.lineTo(r[0], r[1] + r[3]);
    ctx.globalAlpha = 0.25;
    ctx.stroke();
    ctx.globalAlpha = 1;
    label(ctx, name, r[0] + 12, r[1] + 30, "#c2b897");
  };
  box(B.nav, "nav");
  box(B.hero, "hero image");
  box(B.title, "h1");
  box(B.cta, "cta");
  B.cards.forEach((c, i) => box(c, `card ${i + 1}`));
  label(ctx, "grid 12, gutter 24", 60, LH - 18);
};

const type = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "#1b261d";
  font(ctx, 800, 34);
  ctx.fillText("Demo store", 72, 82);
  font(ctx, 500, 26);
  ["Shop", "New", "About", "Cart (0)"].forEach((t, i) => ctx.fillText(t, 1060 + i * 120, 82));
  font(ctx, 860, 104, 66);
  ctx.fillText("Heavyweight", 980, 290);
  ctx.fillText("basics.", 980, 384);
  font(ctx, 700, 30);
  ctx.fillStyle = "#e6d5b8";
  ctx.fillText("Shop the drop", 1012, 508);
  ctx.fillStyle = "#1b261d";
  [
    ["Hoodie, oat", "₹1,499"],
    ["Tee, moss", "₹799"],
    ["Crew, cream", "₹1,199"],
  ].forEach(([n, p], i) => {
    font(ctx, 650, 28);
    ctx.fillText(n, 80 + i * 500, 920);
    font(ctx, 500, 26);
    ctx.fillText(p, 420 + i * 500 - ctx.measureText(p).width + 20, 920);
  });
};

const colour = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "#e6d5b8";
  ctx.fillRect(0, 0, LW, LH);
  ctx.fillStyle = "#c2b897";
  ctx.fillRect(B.hero[0], B.hero[1], B.hero[2], B.hero[3]);
  ctx.fillStyle = "#cfc7aa";
  B.cards.forEach((c) => ctx.fillRect(c[0], c[1], c[2], c[3] - 70));
  ctx.fillStyle = "#1b261d";
  ctx.fillRect(B.cta[0], B.cta[1], B.cta[2], B.cta[3]);
  // a hoodie in the hero, drawn flat
  ctx.fillStyle = "#929884";
  ctx.beginPath();
  ctx.moveTo(380, 250);
  ctx.lineTo(450, 210);
  ctx.quadraticCurveTo(490, 250, 530, 210);
  ctx.lineTo(600, 250);
  ctx.lineTo(690, 360);
  ctx.lineTo(640, 400);
  ctx.lineTo(600, 350);
  ctx.lineTo(600, 600);
  ctx.lineTo(380, 600);
  ctx.lineTo(380, 350);
  ctx.lineTo(340, 400);
  ctx.lineTo(290, 360);
  ctx.closePath();
  ctx.fill();
};

const motion = (ctx: CanvasRenderingContext2D) => {
  ctx.strokeStyle = "#f9dc7d";
  ctx.fillStyle = "#f9dc7d";
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  // the headline rises into place
  ctx.beginPath();
  ctx.moveTo(1000, 470);
  ctx.bezierCurveTo(1000, 380, 1000, 330, 1000, 300);
  ctx.stroke();
  // the hero drifts slower than the page
  ctx.beginPath();
  ctx.moveTo(480, 690);
  ctx.bezierCurveTo(470, 600, 500, 520, 490, 420);
  ctx.stroke();
  // cards stagger in
  B.cards.forEach((c, i) => {
    ctx.beginPath();
    ctx.moveTo(c[0] + 40, c[1] + c[3] + 40);
    ctx.lineTo(c[0] + 40, c[1] + 30);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(c[0] + 40, c[1] + 18);
    ctx.lineTo(c[0] + 52, c[1] + 30);
    ctx.lineTo(c[0] + 40, c[1] + 42);
    ctx.lineTo(c[0] + 28, c[1] + 30);
    ctx.closePath();
    ctx.fill();
    ctx.setLineDash([12, 10]);
    label(ctx, `+${i * 60} ms`, c[0] + 64, c[1] + 40, "#f9dc7d");
  });
  ctx.setLineDash([]);
  label(ctx, "rise 720 ms, glide", 1020, 470, "#f9dc7d");
  label(ctx, "parallax 0.3", 510, 690, "#f9dc7d");
};

const code = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "rgba(9,18,11,0.86)";
  ctx.fillRect(820, 560, 740, 400);
  ctx.strokeStyle = "#334638";
  ctx.strokeRect(820.5, 560.5, 740, 400);
  const lines = [
    ["#929884", "// app/page.tsx"],
    ["#c2b897", "export default function Home() {"],
    ["#cfc7aa", "  return ("],
    ["#e6d5b8", '    <Hero title="Heavyweight basics."'],
    ["#e6d5b8", '          cta={{ label: "Shop the drop" }} />'],
    ["#e6d5b8", "    <ProductGrid items={drop} />"],
    ["#cfc7aa", "  );"],
    ["#c2b897", "}"],
  ];
  lines.forEach(([c, t], i) => {
    ctx.fillStyle = c;
    font(ctx, 520, 28, 80);
    ctx.fillText(t, 850, 610 + i * 42);
  });
};

const deploy = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "#1b261d";
  ctx.fillRect(0, 0, LW, 30);
  ctx.fillStyle = "#334638";
  ctx.fillRect(500, 6, 600, 18);
  font(ctx, 600, 16);
  ctx.fillStyle = "#cfc7aa";
  ctx.fillText("demo-store.example", 720, 21);
  const steps = ["build", "test", "preview", "live"];
  ctx.fillStyle = "rgba(9,18,11,0.86)";
  ctx.fillRect(60, 560, 460, 110);
  steps.forEach((s, i) => {
    const x = 84 + i * 110;
    ctx.strokeStyle = "#f9dc7d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, 600);
    ctx.lineTo(x + 10, 612);
    ctx.lineTo(x + 30, 588);
    ctx.stroke();
    label(ctx, s, x, 648, "#e6d5b8");
  });
};

export const drawLayer = (ctx: CanvasRenderingContext2D, id: LayerId) => {
  if (id === "wireframe") wireframe(ctx);
  if (id === "type") type(ctx);
  if (id === "colour") colour(ctx);
  if (id === "motion") motion(ctx);
  if (id === "code") code(ctx);
  if (id === "deploy") deploy(ctx);
};

/** The finished page: colour, then type, then the browser chrome. */
export const drawFinished = (ctx: CanvasRenderingContext2D) => {
  colour(ctx);
  type(ctx);
  deploy(ctx);
  // the finished page has no build checklist on it
  ctx.fillStyle = "#e6d5b8";
  ctx.fillRect(60, 560, 460, 110);
  ctx.fillStyle = "#c2b897";
  ctx.fillRect(B.hero[0], 560, 460, 100);
};
