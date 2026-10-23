import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/lib/logo/geometry";
import { ROUTES, SITE } from "@/config/site";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

const font = (file: string) => readFile(join(process.cwd(), "assets", "og", file));

/**
 * The share card, one per route: the exact wordmark, the page's name inside the story
 * in the condensed cut, one line on what it is, on the ground green and its grid.
 */
export const ogCard = async ({ index, label, title, line }: { index: string; label: string; title: string; line: string }) => {
  const [display, text] = await Promise.all([font("archivo-display.ttf"), font("archivo-text.ttf")]);
  const host = SITE.url.replace(/^https?:\/\//, "");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 64px", background: "#1B261D", position: "relative", fontFamily: "Archivo" }}>
        {Array.from({ length: 19 }, (_, i) => (
          <div key={`v${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: 60 + i * 60, width: 1, background: "#253026" }} />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <div key={`h${i}`} style={{ position: "absolute", left: 0, right: 0, top: 30 + i * 60, height: 1, background: "#253026" }} />
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <svg width="250" height="66" viewBox={LOGO_VIEWBOX}>
            <path d={LOGO_PATH} fill="#C2B897" />
          </svg>
          <div style={{ display: "flex", gap: 18, fontSize: 22, letterSpacing: 3, color: "#C2B897" }}>
            <span style={{ color: "#929884" }}>{index}</span>
            <span>{label.toUpperCase()}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontFamily: "Archivo Display", fontSize: title.length > 18 ? 128 : 160, lineHeight: 0.86, letterSpacing: -5, color: "#E6D5B8" }}>{title}</div>
          <div style={{ fontSize: 32, lineHeight: 1.3, color: "#CFC7AA", maxWidth: 900 }}>{line}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, fontSize: 22, color: "#929884" }}>
            <div style={{ width: 14, height: 14, background: "#F9DC7D" }} />
            <span>{host}</span>
            <span style={{ marginLeft: "auto" }}>{SITE.city}</span>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Archivo Display", data: display, weight: 800, style: "normal" },
        { name: "Archivo", data: text, weight: 400, style: "normal" },
      ],
    },
  );
};

/** The card for a route in ROUTES. */
export const routeCard = (href: string) => {
  const i = ROUTES.findIndex((r) => r.href === href);
  const r = ROUTES[Math.max(0, i)];
  return ogCard({ index: String(Math.max(0, i)).padStart(2, "0"), label: r.label, title: `${r.chapter}.`, line: r.blurb });
};
