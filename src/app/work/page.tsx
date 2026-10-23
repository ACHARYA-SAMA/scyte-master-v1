import type { Metadata } from "next";
import { Archive } from "@/components/work/Archive";

export const metadata: Metadata = {
  title: "Work",
  description: "The archive: client case studies as they are signed off, and case 00, the site you are on, scene by scene.",
  alternates: { canonical: "/work" },
  openGraph: { url: "/work" },
};

export default function WorkPage() {
  return <Archive />;
}
