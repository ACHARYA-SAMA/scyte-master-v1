import { Big_Shoulders, Big_Shoulders_Stencil, Martian_Mono, Newsreader } from "next/font/google";

/** Display: squared, condensed, variable optical size. Echoes the logo's grid. */
export const display = Big_Shoulders({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-big-shoulders",
  display: "swap",
  fallback: ["Arial Narrow", "Impact", "sans-serif"],
  adjustFontFallback: false,
});

/** Used exactly twice: the 404 and the consent refusal. Not preloaded. */
export const stencil = Big_Shoulders_Stencil({
  subsets: ["latin"],
  weight: "900",
  variable: "--font-stencil",
  display: "swap",
  preload: false,
  fallback: ["Impact", "sans-serif"],
  adjustFontFallback: false,
});

/** The human voice: italic for moments, roman for long-form reading. */
export const serif = Newsreader({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

/** Readouts and data. Tabular by nature. */
export const mono = Martian_Mono({
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  variable: "--font-martian",
  display: "swap",
});

export const fontVariables = [display.variable, stencil.variable, serif.variable, mono.variable].join(" ");
