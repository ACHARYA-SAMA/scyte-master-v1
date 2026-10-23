import type { Metadata } from "next";
import { pageMeta } from "@/config/meta";
import { Team } from "@/components/team/Team";

export const metadata: Metadata = pageMeta({
  title: "Team",
  description: "The people building Scyte and its WhatsApp recovery platform.",
  path: "/team",
});

export default function TeamPage() {
  return <Team />;
}
