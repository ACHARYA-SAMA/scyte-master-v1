"use client";

import { canvasTexture, siteFont } from "../../materials";

/**
 * Signage printed into the film's sets: event names on the pipe walls, reason codes
 * beside the cracks. Drawn once into canvases in the site's own typeface.
 */

const KHAKI = "#c2b897";
const CREAM = "#e6d5b8";
const MUTED = "#929884";
const LUMEN = "#f9dc7d";

type Ctx = CanvasRenderingContext2D;

const font = (ctx: Ctx, weight: number, px: number, stretch: CanvasFontStretch = "normal") => {
  ctx.font = `${weight} ${px}px ${siteFont()}`;
  if ("fontStretch" in ctx) ctx.fontStretch = stretch;
};

const spaced = (ctx: Ctx, em: number, px: number) => {
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${(em * px).toFixed(1)}px`;
};

/** An event on the pipe wall: index and hairline, the name large, its detail under it. */
export const eventSign = (index: number, total: number, name: string, detail: string) =>
  canvasTexture(1024, 320, (c) => {
    const ctx = c as Ctx;
    ctx.clearRect(0, 0, 1024, 320);
    font(ctx, 600, 26, "condensed");
    spaced(ctx, 0.16, 26);
    ctx.fillStyle = KHAKI;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`EVENT ${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, 8, 40);
    ctx.fillStyle = LUMEN;
    ctx.fillRect(8, 60, 14, 14);
    ctx.fillStyle = "rgba(194,184,151,0.55)";
    ctx.fillRect(34, 66, 980, 2);
    font(ctx, 640, 118, "semi-condensed");
    spaced(ctx, -0.02, 118);
    ctx.fillStyle = CREAM;
    ctx.fillText(name, 4, 196);
    font(ctx, 440, 40);
    spaced(ctx, 0.01, 40);
    ctx.fillStyle = MUTED;
    ctx.fillText(detail, 8, 262);
  });

/**
 * A reason code beside its crack: the code, what it means, and a leader line to the
 * right edge where the crack is. `fixed` prints the playbook that answered it instead.
 */
export const reasonSign = (code: string, line: string, fixed: boolean) =>
  canvasTexture(1024, 256, (c) => {
    const ctx = c as Ctx;
    ctx.clearRect(0, 0, 1024, 256);
    ctx.textAlign = "right";
    font(ctx, 620, 22, "condensed");
    spaced(ctx, 0.18, 22);
    ctx.fillStyle = fixed ? LUMEN : MUTED;
    ctx.fillText(fixed ? "PLAYBOOK" : "REASON CODE", 760, 62);
    font(ctx, 680, 62, "condensed");
    spaced(ctx, 0.04, 62);
    ctx.fillStyle = fixed ? LUMEN : CREAM;
    ctx.fillText(code, 760, 134);
    font(ctx, 440, 34);
    spaced(ctx, 0, 34);
    ctx.fillStyle = fixed ? CREAM : MUTED;
    ctx.fillText(line, 760, 186);
    // the leader: out to the crack at the right edge
    ctx.fillStyle = fixed ? "rgba(249,220,125,0.85)" : "rgba(194,184,151,0.6)";
    ctx.fillRect(784, 112, 214, 2);
    ctx.beginPath();
    ctx.arc(1004, 113, 9, 0, Math.PI * 2);
    ctx.fill();
  });
