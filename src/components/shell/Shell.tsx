"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
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

// A feature check that costs nothing. Creating a throwaway context to probe support
// is slow on weak devices; if the real context fails, the boundary below catches it.
const webglAvailable = () => typeof window !== "undefined" && "WebGL2RenderingContext" in window;

/** If the WebGL stage fails for any reason, the site carries on without it. */
class StageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    ui.set({ webgl: "unsupported" });
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * When the WebGL chunk loads. Desktop: once the page is idle after load, so the
 * preloader can include the warm-up. Touch and low-power devices: at the first scroll,
 * tap or key, because the page is complete without it and first paint matters more.
 */
const useStageLoading = () => {
  const [load, setLoad] = useState(false);
  useEffect(() => {
    if (!webglAvailable()) {
      ui.set({ webgl: "unsupported" });
      return;
    }
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      setLoad(true);
    };
    const strong = window.matchMedia("(pointer: fine)").matches && (navigator.hardwareConcurrency || 4) > 4;
    if (strong) {
      const idle = () => {
        const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
        if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 1200 });
        else setTimeout(go, 300);
      };
      if (document.readyState === "complete") idle();
      else window.addEventListener("load", idle, { once: true });
      return;
    }
    ui.set({ webgl: "deferred" });
    const events = ["pointerdown", "touchstart", "wheel", "scroll", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, go));
  }, []);
  return load;
};

export function Shell({ children }: { children: ReactNode }) {
  const loadStage = useStageLoading();
  useEffect(() => {
    loadSoundPreference();
    return startTelemetry();
  }, []);

  return (
    <SmoothScroll>
      {loadStage ? (
        <StageBoundary>
          <Stage />
        </StageBoundary>
      ) : null}
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
