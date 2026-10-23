"use client";

import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { SceneKey } from "@/lib/store";

/**
 * Route-keyed scenes for the persistent canvas. Each is its own chunk, fetched when
 * its section first comes near the viewport (see SceneSection), so a page only ever
 * downloads the 3D it shows.
 */
type Loader = () => Promise<{ default: ComponentType }>;

const LOADERS: Partial<Record<SceneKey, Loader>> = {
  home: () => import("./scenes/home/HomeScene"),
  collect: () => import("./scenes/collect/CollectScene"),
  identify: () => import("./scenes/identify/IdentifyScene"),
  understand: () => import("./scenes/understand/UnderstandScene"),
  measure: () => import("./scenes/measure/MeasureScene"),
};

/** Built once at module scope, so React sees a stable component per scene. */
export const SCENES: Partial<Record<SceneKey, LazyExoticComponent<ComponentType>>> = Object.fromEntries(
  Object.entries(LOADERS).map(([k, load]) => [k, lazy(load as Loader)]),
);

/** Start downloading a scene before it is needed. Safe to call repeatedly. */
export const preloadScene = (key: SceneKey) => {
  void LOADERS[key]?.();
};
