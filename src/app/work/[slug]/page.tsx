import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { THIS_SITE, WORK } from "@/data/work";
import { pageMeta } from "@/config/meta";
import { ClientCase, ThisSiteCase } from "@/components/work/Case";

export const dynamicParams = false;

export function generateStaticParams() {
  return [...WORK.map((w) => ({ slug: w.slug })), { slug: THIS_SITE.slug }];
}

export async function generateMetadata(props: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  if (slug === THIS_SITE.slug) {
    return pageMeta({ title: "Case 00: this site", description: THIS_SITE.summary, path: `/work/${slug}` });
  }
  const w = WORK.find((x) => x.slug === slug);
  if (!w) return {};
  return pageMeta({ title: `${w.client}: ${w.title}`, description: w.summary, path: `/work/${w.slug}` });
}

export default async function CasePage(props: PageProps<"/work/[slug]">) {
  const { slug } = await props.params;
  if (slug === THIS_SITE.slug) return <ThisSiteCase />;
  const w = WORK.find((x) => x.slug === slug);
  if (!w) notFound();
  return <ClientCase w={w} />;
}
