"use client";

import { Suspense, useMemo, type ReactNode } from "react";
import { useChapters } from "@/components/shell/chapters";
import { ProductHero } from "./ProductHero";
import { Collect } from "./stations/Collect";
import { Identify } from "./stations/Identify";
import { Understand } from "./stations/Understand";
import { Decide } from "./stations/Decide";
import { Send } from "./stations/Send";
import { Measure } from "./stations/Measure";
import { Playbooks } from "./Playbooks";
import { Economics } from "./Economics";
import { Dashboard } from "./Dashboard";
import { Pilot } from "./Pilot";

/**
 * Each section is its own Suspense boundary, so hydration commits it in its own task
 * instead of the whole page in one: the long task after load is split into short ones.
 */
const Part = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;

/**
 * The Machine. The rail on the right is Aarav's 20 minutes, from the ad click to the
 * week-four review, and its playhead scrubs the whole page.
 */
export function ProductMachine() {
  useChapters(
    useMemo(
      () => [
        { id: "top", label: "The machine", mark: "", target: "machine-top" },
        { id: "collect", label: "Collect", mark: "0:00", target: "collect" },
        { id: "identify", label: "Identify", mark: "2:10", target: "identify" },
        { id: "understand", label: "Understand", mark: "2:40", target: "understand" },
        { id: "decide", label: "Decide", mark: "3:00", target: "decide" },
        { id: "send", label: "Send", mark: "3:05", target: "send" },
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
      <Part>
        <Collect />
      </Part>
      <Part>
        <Identify />
      </Part>
      <Part>
        <Understand />
      </Part>
      <Part>
        <Decide />
      </Part>
      <Part>
        <Send />
      </Part>
      <Part>
        <Measure />
      </Part>
      <Part>
        <Playbooks />
      </Part>
      <div id="economics">
        <Part>
          <Economics />
        </Part>
      </div>
      <div id="dashboard">
        <Part>
          <Dashboard />
        </Part>
      </div>
      <div id="pilot">
        <Part>
          <Pilot />
        </Part>
      </div>
    </>
  );
}
