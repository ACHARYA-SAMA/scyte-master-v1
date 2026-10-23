import { OG_SIZE, OG_TYPE, ogCard } from "@/lib/og";
import { THIS_SITE, WORK } from "@/data/work";

export const alt = "A Scyte case study";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === THIS_SITE.slug) return ogCard({ index: "03", label: "Case 00", title: `${THIS_SITE.title}.`, line: THIS_SITE.summary });
  const w = WORK.find((x) => x.slug === slug);
  return ogCard({ index: "03", label: w?.year ?? "Work", title: w?.client ?? "Work", line: w?.title ?? "" });
}
