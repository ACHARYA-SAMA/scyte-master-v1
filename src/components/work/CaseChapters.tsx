"use client";

import { useChapters, type PageChapter } from "@/components/shell/chapters";

/** Gives a server-rendered case its rail ticks, one per scene. */
export function CaseChapters({ chapters }: { chapters: PageChapter[] }) {
  useChapters(chapters);
  return null;
}
