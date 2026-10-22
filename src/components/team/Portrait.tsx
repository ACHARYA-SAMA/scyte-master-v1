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
  const [src, setSrc] = useState<string | null>(member.photo);
  useEffect(() => {
    if (member.photo) return setSrc(member.photo);
    const key = `${member.slug}:${size}`;
    const hit = cache.get(key);
    if (hit) return setSrc(hit);
    const url = size === "thumb" ? halftoneDataUrl(member.slug, 160, 7) : halftoneDataUrl(member.slug, 480, 9);
    cache.set(key, url);
    setSrc(url);
  }, [member.photo, member.slug, size]);

  const label = alt ?? (member.photo ? `Portrait of ${member.name ?? member.roleShort}` : `Placeholder silhouette for the ${member.roleShort} seat`);
  if (!src) return <span className={className} role="img" aria-label={label} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={label} className={className} draggable={false} />;
}
