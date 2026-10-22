import localFont from "next/font/local";

/**
 * The one typeface: Archivo, variable on weight (100 to 900) and width (62 to 125).
 * Self-hosted as a 58 KB subset (Basic Latin, punctuation, ₹, arrows) built by
 * scripts/build-font.py, so first paint never waits on a third-party font host.
 */
export const archivo = localFont({
  src: "./fonts/archivo-var.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-archivo",
  display: "swap",
  preload: true,
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
  fallback: ["Arial Narrow", "Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const fontVariables = archivo.variable;
