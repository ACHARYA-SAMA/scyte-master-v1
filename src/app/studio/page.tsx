import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = {
  title: "Studio",
  description: "Scyte designs and builds websites, mobile apps and social media for brands. We work from Hyderabad.",
  alternates: { canonical: "/studio" },
  openGraph: { url: "/studio" },
};

export default function StudioPage() {
  return <Studio />;
}
