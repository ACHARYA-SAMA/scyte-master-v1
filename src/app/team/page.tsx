import type { Metadata } from "next";
import { StageScene } from "@/components/stage/StageControls";
import { Team } from "@/components/team/Team";

export const metadata: Metadata = {
  title: "Team",
  description: "The people building Scyte, the web and app studio in Hyderabad, and its WhatsApp recovery platform.",
  alternates: { canonical: "/team" },
  openGraph: { url: "/team" },
};

export default function TeamPage() {
  return (
    <>
      <StageScene scene="team" />
      <Team />
    </>
  );
}
