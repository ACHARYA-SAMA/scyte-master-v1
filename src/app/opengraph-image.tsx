import { ImageResponse } from "next/og";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/lib/logo/geometry";

export const alt = "Scyte, a web and app studio in Hyderabad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The share card: the exact traced wordmark on forest, on its own 5-unit grid. */
export default function OpengraphImage() {
  const cells = Array.from({ length: 40 }, (_, i) => i);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0A0F0C",
          padding: 64,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", gap: 14 }}>
          {cells.slice(0, 12).map((i) => (
            <div key={i} style={{ width: 14, height: 14, background: i === 11 ? "#FF3D2E" : "#2A3A2F" }} />
          ))}
        </div>
        <svg width="1072" height="285" viewBox={LOGO_VIEWBOX}>
          <path d={LOGO_PATH} fill="#C2B897" />
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#9A9379", fontSize: 26 }}>
          <span>Websites, apps, social. And WhatsApp recovery for online stores.</span>
          <span>Hyderabad</span>
        </div>
      </div>
    ),
    size,
  );
}
