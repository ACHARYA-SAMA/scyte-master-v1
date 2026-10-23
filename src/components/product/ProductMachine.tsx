"use client";

import { useMemo } from "react";
import { useChapters } from "@/components/shell/chapters";
import { ProductHero } from "./ProductHero";
import { Storefront } from "./stations/Storefront";
import { Identify } from "./stations/Identify";
import { Understand } from "./stations/Understand";
import { Decide } from "./stations/Decide";
import { Send } from "./stations/Send";
import { Anatomy } from "./stations/Anatomy";
import { Measure } from "./stations/Measure";
import { Playbooks } from "./Playbooks";
import { Economics } from "./Economics";
import { Dashboard } from "./Dashboard";
import { Pilot } from "./Pilot";

/**
 * The Machine. The rail on the right is Aarav's 20 minutes, from the ad click to the
 * week-four review, and its playhead scrubs the whole page.
 */
export function ProductMachine() {
  useChapters(
    useMemo(
      () => [
        { id: "top", label: "The line", mark: "", target: "machine-top" },
        { id: "collect", label: "Collect", mark: "0:00", target: "collect" },
        { id: "identify", label: "Identify", mark: "2:10", target: "identify" },
        { id: "understand", label: "Understand", mark: "2:40", target: "understand" },
        { id: "decide", label: "Decide", mark: "3:00", target: "decide" },
        { id: "send", label: "Send", mark: "3:05", target: "send" },
        { id: "anatomy", label: "Anatomy", target: "anatomy" },
        { id: "measure", label: "Measure", mark: "Wk 4", target: "measure" },
        { id: "playbooks", label: "Playbooks", target: "playbooks" },
        { id: "economics", label: "The money", target: "economics" },
        { id: "dashboard", label: "Dashboard", target: "dashboard" },
        { id: "pilot", label: "Pilot", target: "pilot" },
      ],
      [],
    ),
    { scrub: true },
  );

  return (
    <>
      <ProductHero />
      <Storefront />
      <Identify />
      <Understand />
      <Decide />
      <Send />
      <Anatomy />
      <Measure />
      <Playbooks />
      <div id="economics">
      <Economics />
      </div>
      <div id="dashboard">
      <Dashboard />
      </div>
      <div id="pilot">
      <Pilot />
      </div>
    </>
  );
}
