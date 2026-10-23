"use client";

import { useEffect, useState } from "react";
import { assetsFor, type Member } from "@/data/team";
import { duotoneDataUrl } from "@/lib/silhouette";

const cache = new Map<string, string>();

/**
 * A member's portrait: the processed photo when there is one, otherwise the
 * generated silhouette in the palette. Drawn when idle, cached per size.
 */
export function Portrait({ member, size = "thumb", className }: { member: Member; size?: "thumb" | "large"; className?: string }) {
  const asset = assetsFor(member.slug);
  const key = `${member.slug}:${size}`;
  const [src, setSrc] = useState<string | null>(() => (asset ? (size === "thumb" ? asset.thumb : asset.photo) : (cache.get(key) ?? null)));

  useEffect(() => {
    if (asset || src) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    const run = () => {
      const url = duotoneDataUrl(member.slug, size === "thumb" ? 200 : 720);
      cache.set(key, url);
      setSrc(url);
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run);
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(run, 60);
    return () => window.clearTimeout(t);
  }, [asset, key, member.slug, size, src]);

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- data URLs and generated assets, sized by CSS
    <img src={src} alt="" className={className} draggable={false} />
  ) : (
    <span className={className} aria-hidden />
  );
}
