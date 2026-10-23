import type { Metadata } from "next";
import { Team } from "@/components/team/Team";

export const metadata: Metadata = {
  title: "Team",
  description: "The people building Scyte and its WhatsApp recovery platform.",
  alternates: { canonical: "/team" },
  openGraph: { url: "/team" },
};

export default function TeamPage() {
  return <Team />;
}
