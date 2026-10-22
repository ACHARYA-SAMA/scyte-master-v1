"use client";

import { useEffect, useState } from "react";
import type { Member } from "@/data/team";
import { halftoneDataUrl } from "@/lib/silhouette";

const cache = new Map<string, string>();

/** The member's photo, or their generated silhouette as an event-pixel halftone. */
export function Portrait({
  member,
  className,
  alt,
  size = "thumb",
}: {
  member: Member;
  className?: string;
  alt?: string;
  size?: "thumb" | "large";
}) {
  const key = `${member.slug}:${size}`;
  const [src, setSrc] = useState<string | null>(() => member.photo ?? cache.get(key) ?? null);
  useEffect(() => {
    if (member.photo || cache.has(key)) return;
    // Off the critical path: thumbnails are drawn when the main thread is idle.
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const run = () => {
      const url = size === "thumb" ? halftoneDataUrl(member.slug, 160, 7) : halftoneDataUrl(member.slug, 480, 9);
      cache.set(key, url);
      setSrc(url);
    };
    if (size === "large" || !w.requestIdleCallback) return run();
    const id = w.requestIdleCallback(run, { timeout: 800 });
    return () => w.cancelIdleCallback?.(id);
  }, [member.photo, member.slug, size, key]);

  const label = alt ?? (member.photo ? `Portrait of ${member.name ?? member.roleShort}` : `Placeholder silhouette for the ${member.roleShort} seat`);
  if (!src) return <span className={className} role="img" aria-label={label} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={label} className={className} draggable={false} />;
}
