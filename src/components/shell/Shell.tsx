"use client";

import { useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { Nav } from "@/components/nav/Nav";
import { Cursor } from "@/components/cursor/Cursor";
import { Curtain } from "@/components/transition/Curtain";
import { RouteWatcher } from "@/components/transition/navigation";
import { Preloader } from "@/components/preloader/Preloader";
import { ScrollRuler } from "./ScrollRuler";
import { Footer } from "./Footer";
import { startTelemetry } from "@/lib/telemetry";
import { loadSoundPreference } from "@/lib/sound";
import { ui } from "@/lib/store";

// The WebGL stage is its own chunk, fetched after hydration so first paint is plain HTML.
const Stage = dynamic(() => import("@/components/stage/Stage").then((m) => m.Stage), {
  ssr: false,
  loading: () => null,
});

const webglAvailable = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

export function Shell({ children }: { children: ReactNode }) {
  useEffect(() => {
    loadSoundPreference();
    const stop = startTelemetry();
    if (!webglAvailable()) ui.set({ webgl: "unsupported" });
    return stop;
  }, []);

  return (
    <SmoothScroll>
      <Stage />
      <Nav />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <ScrollRuler />
      <Cursor />
      <Curtain />
      <Preloader />
      <RouteWatcher />
    </SmoothScroll>
  );
}
