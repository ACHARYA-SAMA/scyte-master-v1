"use client";

import { useEffect } from "react";
import { rail, type Chapter } from "@/lib/store";

export type PageChapter = Chapter & { /** id of the section element that starts the chapter */ target: string };

let registered: PageChapter[] = [];

export const pageChapters = () => registered;

/**
 * A page lists its chapters once; the rail, the nav readout and the command palette
 * pick them up. Pass `scrub` to let the rail's playhead drive the page.
 */
export const useChapters = (chapters: PageChapter[], options: { scrub?: boolean } = {}) => {
  const key = chapters.map((c) => c.id).join("|");
  const scrub = Boolean(options.scrub);
  useEffect(() => {
    registered = chapters;
    rail.set({ chapters: chapters.map(({ id, label, mark }) => ({ id, label, mark })), active: 0, scrub });
    return () => {
      registered = [];
      rail.set({ chapters: [], active: 0, scrub: false, progress: 0, marks: [] });
    };
    // chapters are static per page; the key captures identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, scrub]);
};
