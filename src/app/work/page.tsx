import type { Metadata } from "next";
import { pageMeta } from "@/config/meta";
import { Archive } from "@/components/work/Archive";

export const metadata: Metadata = pageMeta({
  title: "Work",
  description: "The archive: client case studies as they are signed off, and case 00, the site you are on, scene by scene.",
  path: "/work",
});

export default function WorkPage() {
  return <Archive />;
}
