// Generates every raster brand asset from the traced geometry, never from a font.
//
//   npm run brand:icons
//
// Favicons at 16-48 px use the logo's own S glyph (the full wordmark is illegible at
// that size); the apple-touch icon and manifest icons use the full wordmark.

import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const geo = await import(new URL("file:///" + path.join(ROOT, "src/lib/logo/geometry.ts").replace(/\\/g, "/")));
const { LOGO_PATH, GLYPHS, glyphPath, LOGO_WIDTH, LOGO_CAP_HEIGHT, LOGO_OVERSHOOT } = geo;

const FOREST = "#1C261F";
const BONE = "#C2B897";
const S = glyphPath(GLYPHS[0]); // S spans x 0..29, y 0..37

const sGlyphSvg = (bg = true) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5.5 -1.5 40 40">` +
  (bg ? `<rect x="-5.5" y="-1.5" width="40" height="40" fill="${FOREST}"/>` : "") +
  `<path d="${S}" fill="${BONE}"/></svg>`;

const wordmarkSvg = (pad = 0.16) => {
  const w = LOGO_WIDTH * (1 + pad * 2);
  const x0 = -LOGO_WIDTH * pad;
  const y0 = -LOGO_OVERSHOOT - (w - LOGO_CAP_HEIGHT - LOGO_OVERSHOOT) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${w}">` +
    `<rect x="${x0}" y="${y0}" width="${w}" height="${w}" fill="${FOREST}"/>` +
    `<path d="${LOGO_PATH}" fill="${BONE}"/></svg>`
  );
};

const png = (svg, size) => new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();

// ICO container holding PNG images (supported by every current browser).
const ico = (images) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = 6 + dir.length;
  images.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...images.map((im) => im.data)]);
};

const write = (rel, data) => {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
  console.log("wrote", rel, data.length, "bytes");
};

write("src/app/icon.svg", sGlyphSvg());
write("src/app/favicon.ico", ico([16, 32, 48].map((size) => ({ size, data: png(sGlyphSvg(), size) }))));
write("src/app/apple-icon.png", png(wordmarkSvg(0.14), 180));
write("public/brand/icon-192.png", png(wordmarkSvg(0.14), 192));
write("public/brand/icon-512.png", png(wordmarkSvg(0.14), 512));
write("public/brand/icon-maskable-512.png", png(wordmarkSvg(0.3), 512));
write(
  "public/brand/scyte-logo-bone-1400.png",
  new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -${LOGO_OVERSHOOT} ${LOGO_WIDTH} ${LOGO_CAP_HEIGHT + LOGO_OVERSHOOT}"><path d="${LOGO_PATH}" fill="${BONE}"/></svg>`,
    { fitTo: { mode: "width", value: 1400 } },
  )
    .render()
    .asPng(),
);
