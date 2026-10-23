import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lab } from "@/components/lab/Lab";

export const metadata: Metadata = {
  title: "Component lab",
  robots: { index: false, follow: false },
};

/** The component library with every state visible. Development builds only. */
export default function LabPage() {
  if (process.env.NODE_ENV === "production" && process.env.SCYTE_LAB !== "1") notFound();
  return <Lab />;
}
