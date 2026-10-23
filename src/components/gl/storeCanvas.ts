"use client";

import { siteFont } from "./materials";

/**
 * The fictional store's product page, drawn in layers so it can be shown whole,
 * exploded into its parts, or x-rayed down to the events each part records.
 * Canvas units: 1600 x 1000. Palette colours only.
 */
export const STORE_W = 1600;
export const STORE_H = 1000;

export type StoreLayer = "page" | "image" | "title" | "sizes" | "button" | "reviews";

export const LAYER_RECTS: Record<Exclude<StoreLayer, "page">, [number, number, number, number]> = {
  image: [56, 140, 760, 800],
  title: [880, 160, 660, 260],
  sizes: [880, 446, 470, 186],
  button: [880, 660, 640, 96],
  reviews: [880, 790, 660, 170],
};

/** What each part of the page records, from the report's event catalogue. */
export const LAYER_EVENTS: Record<Exclude<StoreLayer, "page">, string[]> = {
  image: ["product_view {source: instagram_ad}", "gallery_interaction"],
  title: ["engaged_time 38 s", "scroll_depth 64 %"],
  sizes: ["size_chart_open", "variant_selected {M}"],
  button: ["add_to_cart {variant: M}"],
  reviews: ["review_scroll 80 %"],
};

const f = (w: number, size: number) => `${w} ${size}px ${siteFont()}`;

const page = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "#e6d5b8";
  ctx.fillRect(0, 0, STORE_W, STORE_H);
  ctx.fillStyle = "#1b261d";
  ctx.fillRect(0, 0, STORE_W, 86);
  ctx.fillStyle = "#e6d5b8";
  ctx.font = f(700, 34);
  ctx.fillText("Demo store", 56, 56);
  ctx.font = f(500, 24);
  ctx.fillStyle = "#c2b897";
  ctx.fillText("Not a real shop", 280, 56);
  ctx.fillText("Cart (0)", STORE_W - 180, 56);
};

const image = (ctx: CanvasRenderingContext2D, ox = 0, oy = 0) => {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.fillStyle = "#cfc7aa";
  ctx.fillRect(56, 140, 760, 800);
  ctx.fillStyle = "#c2b897";
  ctx.beginPath();
  ctx.moveTo(300, 300);
  ctx.lineTo(380, 250);
  ctx.quadraticCurveTo(436, 300, 492, 250);
  ctx.lineTo(572, 300);
  ctx.lineTo(680, 430);
  ctx.lineTo(620, 480);
  ctx.lineTo(572, 420);
  ctx.lineTo(572, 820);
  ctx.lineTo(300, 820);
  ctx.lineTo(300, 420);
  ctx.lineTo(252, 480);
  ctx.lineTo(192, 430);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#929884";
  ctx.fillRect(360, 640, 152, 70);
  ctx.strokeStyle = "#929884";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(380, 250);
  ctx.quadraticCurveTo(436, 360, 492, 250);
  ctx.stroke();
  // gallery dots
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i === 0 ? "#1b261d" : "#929884";
    ctx.fillRect(390 + i * 28, 900, 14, 14);
  }
  ctx.restore();
};

const title = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "#1b261d";
  ctx.font = f(800, 64);
  ctx.fillText("Heavyweight", 880, 230);
  ctx.fillText("hoodie, oat", 880, 300);
  ctx.font = f(600, 44);
  ctx.fillText("₹1,499", 880, 390);
};

const sizes = (ctx: CanvasRenderingContext2D) => {
  ctx.font = f(500, 26);
  ctx.fillStyle = "#334638";
  ctx.fillText("Size", 880, 470);
  ["S", "M", "L", "XL"].forEach((s, i) => {
    const x = 880 + i * 112;
    ctx.strokeStyle = "#1b261d";
    ctx.lineWidth = 3;
    if (s === "M") {
      ctx.fillStyle = "#1b261d";
      ctx.fillRect(x, 490, 92, 70);
      ctx.fillStyle = "#e6d5b8";
    } else {
      ctx.strokeRect(x, 490, 92, 70);
      ctx.fillStyle = "#1b261d";
    }
    ctx.font = f(700, 30);
    ctx.fillText(s, x + 46 - ctx.measureText(s).width / 2, 536);
  });
  ctx.fillStyle = "#334638";
  ctx.font = f(500, 26);
  ctx.fillText("Size chart", 880, 610);
  ctx.fillRect(880, 618, 118, 2);
};

const button = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "#1b261d";
  ctx.fillRect(880, 660, 640, 96);
  ctx.fillStyle = "#e6d5b8";
  ctx.font = f(700, 34);
  ctx.fillText("Add to cart", 1110, 720);
};

const reviews = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "#334638";
  ctx.font = f(500, 26);
  ctx.fillText("Reviews", 880, 820);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#cfc7aa";
    ctx.fillRect(880, 846 + i * 34, 640 - i * 120, 14);
  }
};

/** The whole page, as a shopper sees it. */
export const drawStore = (ctx: CanvasRenderingContext2D) => {
  page(ctx);
  image(ctx);
  title(ctx);
  sizes(ctx);
  button(ctx);
  reviews(ctx);
};

/** One layer on a transparent canvas the size of its rect (page: the whole canvas). */
export const drawLayer = (ctx: CanvasRenderingContext2D, layer: StoreLayer) => {
  if (layer === "page") return page(ctx);
  const [x, y] = LAYER_RECTS[layer];
  ctx.translate(-x, -y);
  if (layer === "image") image(ctx);
  if (layer === "title") title(ctx);
  if (layer === "sizes") sizes(ctx);
  if (layer === "button") button(ctx);
  if (layer === "reviews") reviews(ctx);
};

/** The x-ray: the same page as the events it produces. */
export const drawEvents = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "#152018";
  ctx.fillRect(0, 0, STORE_W, STORE_H);
  ctx.strokeStyle = "rgba(51,70,56,0.9)";
  ctx.lineWidth = 1;
  for (let x = 0; x < STORE_W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, STORE_H);
    ctx.stroke();
  }
  for (let y = 0; y < STORE_H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(STORE_W, y + 0.5);
    ctx.stroke();
  }
  const box = (x: number, y: number, w: number, h: number, lines: string[]) => {
    ctx.strokeStyle = "#c2b897";
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.fillStyle = "#f9dc7d";
    ctx.fillRect(x - 6, y - 6, 12, 12);
    ctx.font = f(650, 30);
    lines.forEach((l, i) => {
      ctx.fillStyle = i === 0 ? "#e6d5b8" : "#929884";
      ctx.fillText(l, x + 18, y + 46 + i * 40);
    });
  };
  box(20, 14, STORE_W - 40, 60, ["page_view {source: instagram_ad}   anonymous_id a91f-3c"]);
  (Object.keys(LAYER_RECTS) as (keyof typeof LAYER_RECTS)[]).forEach((k) => {
    const [x, y, w, h] = LAYER_RECTS[k];
    box(x, y, w, h, LAYER_EVENTS[k]);
  });
};
