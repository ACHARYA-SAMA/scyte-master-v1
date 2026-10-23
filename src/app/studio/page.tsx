import type { Metadata } from "next";
import { pageMeta } from "@/config/meta";
import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = pageMeta({
  title: "Studio",
  description: "Scyte designs and builds websites, mobile apps and social media for brands. We work from Hyderabad.",
  path: "/studio",
});

export default function StudioPage() {
  return <Studio />;
}
